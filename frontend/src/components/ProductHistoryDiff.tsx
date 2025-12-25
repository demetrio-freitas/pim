'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  History,
  ChevronDown,
  ChevronUp,
  User,
  Clock,
  Plus,
  Minus,
  Edit3,
  ArrowRight,
  Loader2,
} from 'lucide-react';

interface HistoryEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId?: string;
  userName?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changedFields?: string[];
  createdAt: string;
}

interface ProductHistoryDiffProps {
  productId: string;
}

// Field labels in Portuguese
const fieldLabels: Record<string, string> = {
  name: 'Nome',
  sku: 'SKU',
  description: 'Descrição',
  shortDescription: 'Descrição Curta',
  price: 'Preço',
  costPrice: 'Preço de Custo',
  compareAtPrice: 'Preço Comparativo',
  stockQuantity: 'Quantidade em Estoque',
  isInStock: 'Em Estoque',
  status: 'Status',
  type: 'Tipo',
  brand: 'Marca',
  vendor: 'Fornecedor',
  manufacturer: 'Fabricante',
  weight: 'Peso',
  weightUnit: 'Unidade de Peso',
  length: 'Comprimento',
  width: 'Largura',
  height: 'Altura',
  dimensionUnit: 'Unidade de Dimensão',
  urlKey: 'URL',
  metaTitle: 'Meta Título',
  metaDescription: 'Meta Descrição',
  metaKeywords: 'Palavras-chave',
  gtin: 'GTIN',
  mpn: 'MPN',
  barcode: 'Código de Barras',
  taxable: 'Tributável',
  requiresShipping: 'Requer Frete',
  inventoryPolicy: 'Política de Estoque',
  inventoryManagement: 'Gestão de Estoque',
  fulfillmentService: 'Serviço de Fulfillment',
  countryOfOrigin: 'País de Origem',
  hsCode: 'Código HS',
  isFeatured: 'Destaque',
  isNew: 'Novo',
  isOnSale: 'Em Promoção',
  saleStartDate: 'Início da Promoção',
  saleEndDate: 'Fim da Promoção',
  productCondition: 'Condição',
  ageGroup: 'Faixa Etária',
  gender: 'Gênero',
  color: 'Cor',
  size: 'Tamanho',
  material: 'Material',
  pattern: 'Padrão',
  warranty: 'Garantia',
  warrantyType: 'Tipo de Garantia',
  mlListingType: 'Tipo de Anúncio ML',
  mlShippingMode: 'Modo de Envio ML',
  mlFreeShipping: 'Frete Grátis ML',
  mlCategoryId: 'Categoria ML',
  asin: 'ASIN Amazon',
  amazonFulfillmentChannel: 'Canal Amazon',
  amazonProductType: 'Tipo Amazon',
  googleCategory: 'Categoria Google',
  googleCategoryId: 'ID Categoria Google',
  tags: 'Tags',
  completenessScore: 'Score de Completude',
};

const actionLabels: Record<string, string> = {
  CREATE: 'Criação',
  UPDATE: 'Atualização',
  DELETE: 'Exclusão',
  STATUS_CHANGE: 'Mudança de Status',
  PUBLISH: 'Publicação',
  UNPUBLISH: 'Despublicação',
  ARCHIVE: 'Arquivamento',
};

const actionColors: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  UPDATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  STATUS_CHANGE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  PUBLISH: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  UNPUBLISH: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  ARCHIVE: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

function formatValue(value: any): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return value.toString();
    return value.toFixed(2);
  }
  if (typeof value === 'object') {
    if (Array.isArray(value)) return value.join(', ');
    return JSON.stringify(value);
  }
  return String(value);
}

function DiffLine({
  field,
  oldValue,
  newValue,
  type,
}: {
  field: string;
  oldValue?: any;
  newValue?: any;
  type: 'added' | 'removed' | 'changed';
}) {
  const label = fieldLabels[field] || field;

  if (type === 'added') {
    return (
      <div className="flex items-start gap-2 py-1.5 px-2 bg-green-50 dark:bg-green-900/20 rounded">
        <Plus className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-dark-700 dark:text-dark-300">{label}:</span>
          <span className="ml-2 text-sm text-green-700 dark:text-green-400 break-words">
            {formatValue(newValue)}
          </span>
        </div>
      </div>
    );
  }

  if (type === 'removed') {
    return (
      <div className="flex items-start gap-2 py-1.5 px-2 bg-red-50 dark:bg-red-900/20 rounded">
        <Minus className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-dark-700 dark:text-dark-300">{label}:</span>
          <span className="ml-2 text-sm text-red-700 dark:text-red-400 line-through break-words">
            {formatValue(oldValue)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 py-1.5 px-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
      <Edit3 className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-dark-700 dark:text-dark-300">{label}:</span>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-sm text-red-600 dark:text-red-400 line-through break-words bg-red-100 dark:bg-red-900/30 px-1 rounded">
            {formatValue(oldValue)}
          </span>
          <ArrowRight className="w-3 h-3 text-dark-400 flex-shrink-0" />
          <span className="text-sm text-green-600 dark:text-green-400 break-words bg-green-100 dark:bg-green-900/30 px-1 rounded">
            {formatValue(newValue)}
          </span>
        </div>
      </div>
    </div>
  );
}

function HistoryEntryCard({ entry, isExpanded, onToggle }: {
  entry: HistoryEntry;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const oldValues = entry.oldValues || {};
  const newValues = entry.newValues || {};
  const changedFields = entry.changedFields || Object.keys({ ...oldValues, ...newValues });

  const hasChanges = changedFields.length > 0;

  return (
    <div className="border border-dark-200 dark:border-dark-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-dark-50 dark:hover:bg-dark-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={cn('px-2 py-1 rounded text-xs font-medium', actionColors[entry.action] || actionColors.UPDATE)}>
            {actionLabels[entry.action] || entry.action}
          </span>
          <div className="flex items-center gap-2 text-sm text-dark-500 dark:text-dark-400">
            <User className="w-3.5 h-3.5" />
            <span>{entry.userName || 'Sistema'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-dark-500 dark:text-dark-400">
            <Clock className="w-3.5 h-3.5" />
            <span>{new Date(entry.createdAt).toLocaleString('pt-BR')}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="text-xs text-dark-500 dark:text-dark-400">
              {changedFields.length} campo(s) alterado(s)
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-dark-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-dark-400" />
          )}
        </div>
      </button>

      {isExpanded && hasChanges && (
        <div className="border-t border-dark-200 dark:border-dark-700 p-4 space-y-2 bg-dark-50/50 dark:bg-dark-800/30">
          {changedFields.map((field) => {
            const oldValue = oldValues[field];
            const newValue = newValues[field];

            let type: 'added' | 'removed' | 'changed' = 'changed';
            if (oldValue === undefined || oldValue === null) {
              type = 'added';
            } else if (newValue === undefined || newValue === null) {
              type = 'removed';
            }

            return (
              <DiffLine
                key={field}
                field={field}
                oldValue={oldValue}
                newValue={newValue}
                type={type}
              />
            );
          })}
        </div>
      )}

      {isExpanded && !hasChanges && (
        <div className="border-t border-dark-200 dark:border-dark-700 p-4 bg-dark-50/50 dark:bg-dark-800/30">
          <p className="text-sm text-dark-500 dark:text-dark-400 italic">
            Nenhuma alteração de campo registrada
          </p>
        </div>
      )}
    </div>
  );
}

export default function ProductHistoryDiff({ productId }: ProductHistoryDiffProps) {
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['product-history', productId],
    queryFn: () => api.getProductHistory(productId, { page: 0, size: showAll ? 100 : 10 }),
  });

  const history: HistoryEntry[] = data?.content || [];

  const toggleEntry = (id: string) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedEntries(newExpanded);
  };

  const expandAll = () => {
    setExpandedEntries(new Set(history.map((e) => e.id)));
  };

  const collapseAll = () => {
    setExpandedEntries(new Set());
  };

  if (isLoading) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-dark-500" />
          <h2 className="text-lg font-semibold text-dark-900 dark:text-white">
            Histórico de Alterações
          </h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-dark-500" />
          <h2 className="text-lg font-semibold text-dark-900 dark:text-white">
            Histórico de Alterações
          </h2>
        </div>
        <p className="text-dark-500 dark:text-dark-400">
          Erro ao carregar histórico
        </p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-dark-500" />
          <h2 className="text-lg font-semibold text-dark-900 dark:text-white">
            Histórico de Alterações
          </h2>
          {data?.totalElements > 0 && (
            <span className="text-sm text-dark-500 dark:text-dark-400">
              ({data.totalElements} registro{data.totalElements !== 1 ? 's' : ''})
            </span>
          )}
        </div>
        {history.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              Expandir Todos
            </button>
            <span className="text-dark-300">|</span>
            <button
              onClick={collapseAll}
              className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              Recolher Todos
            </button>
          </div>
        )}
      </div>

      {history.length === 0 ? (
        <p className="text-dark-500 dark:text-dark-400 italic py-4">
          Nenhum histórico de alterações encontrado
        </p>
      ) : (
        <div className="space-y-3">
          {history.map((entry) => (
            <HistoryEntryCard
              key={entry.id}
              entry={entry}
              isExpanded={expandedEntries.has(entry.id)}
              onToggle={() => toggleEntry(entry.id)}
            />
          ))}
        </div>
      )}

      {data && data.totalElements > 10 && !showAll && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowAll(true)}
            className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            Ver todo o histórico ({data.totalElements} registros)
          </button>
        </div>
      )}
    </div>
  );
}
