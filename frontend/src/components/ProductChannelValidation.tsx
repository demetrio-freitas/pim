'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Store,
  ShoppingCart,
  Package,
  Search,
  Globe,
  Box,
} from 'lucide-react';

interface ValidationError {
  field: string;
  message: string;
  severity: string;
}

interface ChannelValidationResult {
  channelCode: string;
  channelName: string;
  isValid: boolean;
  score: number;
  errors: ValidationError[];
  warnings: ValidationError[];
  requiredFields: string[];
  missingFields: string[];
  recommendedFields: string[];
}

interface ChannelInfo {
  code: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

interface ProductChannelValidationProps {
  productId: string;
}

const channelIcons: Record<string, React.ElementType> = {
  mercadolivre: Package,
  amazon: ShoppingCart,
  shopify: Store,
  google_shopping: Search,
  woocommerce: Box,
  vtex: Globe,
};

const fieldLabels: Record<string, string> = {
  name: 'Nome',
  sku: 'SKU',
  description: 'Descrição',
  shortDescription: 'Descrição Curta',
  price: 'Preço',
  stockQuantity: 'Quantidade em Estoque',
  gtin: 'GTIN/EAN',
  mpn: 'MPN',
  brand: 'Marca',
  manufacturer: 'Fabricante',
  weight: 'Peso',
  productCondition: 'Condição do Produto',
  mlCategoryId: 'Categoria ML',
  mlListingType: 'Tipo de Anúncio ML',
  mlShippingMode: 'Modo de Envio ML',
  asin: 'ASIN',
  amazonProductType: 'Tipo de Produto Amazon',
  googleCategory: 'Categoria Google',
  googleCategoryId: 'ID Categoria Google',
  ageGroup: 'Faixa Etária',
  gender: 'Gênero',
  color: 'Cor',
  size: 'Tamanho',
  material: 'Material',
  metaTitle: 'Meta Título',
  metaDescription: 'Meta Descrição',
  urlKey: 'URL',
  images: 'Imagens',
  media: 'Mídia',
};

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600 dark:text-green-400';
  if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
  if (score >= 50) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

function getScoreBgColor(score: number): string {
  if (score >= 90) return 'bg-green-100 dark:bg-green-900/30';
  if (score >= 70) return 'bg-yellow-100 dark:bg-yellow-900/30';
  if (score >= 50) return 'bg-orange-100 dark:bg-orange-900/30';
  return 'bg-red-100 dark:bg-red-900/30';
}

function ChannelValidationCard({
  result,
  channelInfo,
  isExpanded,
  onToggle,
}: {
  result: ChannelValidationResult;
  channelInfo?: ChannelInfo;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const IconComponent = channelIcons[result.channelCode] || Store;
  const hasIssues = result.errors.length > 0 || result.warnings.length > 0;

  return (
    <div className="border border-dark-200 dark:border-dark-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-dark-50 dark:hover:bg-dark-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: channelInfo?.color || '#6B7280' }}
          >
            <IconComponent className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <div className="font-medium text-dark-900 dark:text-white">
              {result.channelName}
            </div>
            <div className="text-sm text-dark-500 dark:text-dark-400">
              {channelInfo?.description || result.channelCode}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Score */}
          <div
            className={cn(
              'px-3 py-1 rounded-full text-sm font-medium',
              getScoreBgColor(result.score),
              getScoreColor(result.score)
            )}
          >
            {result.score}%
          </div>

          {/* Status */}
          {result.isValid ? (
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Válido</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <XCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Inválido</span>
            </div>
          )}

          {/* Issues Count */}
          {hasIssues && (
            <div className="flex items-center gap-2 text-sm text-dark-500 dark:text-dark-400">
              {result.errors.length > 0 && (
                <span className="text-red-600 dark:text-red-400">
                  {result.errors.length} erro(s)
                </span>
              )}
              {result.warnings.length > 0 && (
                <span className="text-yellow-600 dark:text-yellow-400">
                  {result.warnings.length} aviso(s)
                </span>
              )}
            </div>
          )}

          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-dark-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-dark-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-dark-200 dark:border-dark-700 p-4 bg-dark-50/50 dark:bg-dark-800/30 space-y-4">
          {/* Errors */}
          {result.errors.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Erros ({result.errors.length})
              </h4>
              <div className="space-y-2">
                {result.errors.map((error, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm"
                  >
                    <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-dark-700 dark:text-dark-300">
                        {fieldLabels[error.field] || error.field}:
                      </span>
                      <span className="ml-1 text-red-700 dark:text-red-400">
                        {error.message}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-yellow-600 dark:text-yellow-400 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Avisos ({result.warnings.length})
              </h4>
              <div className="space-y-2">
                {result.warnings.map((warning, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-sm"
                  >
                    <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-dark-700 dark:text-dark-300">
                        {fieldLabels[warning.field] || warning.field}:
                      </span>
                      <span className="ml-1 text-yellow-700 dark:text-yellow-400">
                        {warning.message}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing Required Fields */}
          {result.missingFields.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-dark-600 dark:text-dark-300 mb-2">
                Campos Obrigatórios Faltando
              </h4>
              <div className="flex flex-wrap gap-2">
                {result.missingFields.map((field) => (
                  <span
                    key={field}
                    className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-sm"
                  >
                    {fieldLabels[field] || field}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Fields */}
          {result.recommendedFields.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-dark-600 dark:text-dark-300 mb-2">
                Campos Recomendados
              </h4>
              <div className="flex flex-wrap gap-2">
                {result.recommendedFields.map((field) => (
                  <span
                    key={field}
                    className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-sm"
                  >
                    {fieldLabels[field] || field}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* All Valid */}
          {result.isValid && result.errors.length === 0 && result.warnings.length === 0 && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded text-green-700 dark:text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span>Produto está pronto para publicação neste canal!</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProductChannelValidation({ productId }: ProductChannelValidationProps) {
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());

  const {
    data: validationResults,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['channel-validation', productId],
    queryFn: () => api.validateProductForAllMarketplaces(productId),
  });

  const { data: availableChannels } = useQuery({
    queryKey: ['available-channels'],
    queryFn: () => api.getAvailableMarketplaceChannels(),
  });

  const toggleChannel = (code: string) => {
    const newExpanded = new Set(expandedChannels);
    if (newExpanded.has(code)) {
      newExpanded.delete(code);
    } else {
      newExpanded.add(code);
    }
    setExpandedChannels(newExpanded);
  };

  const expandAll = () => {
    if (validationResults) {
      setExpandedChannels(new Set(Object.keys(validationResults)));
    }
  };

  const collapseAll = () => {
    setExpandedChannels(new Set());
  };

  const channelsMap: Record<string, ChannelInfo> =
    availableChannels?.reduce(
      (acc: Record<string, ChannelInfo>, ch: ChannelInfo) => {
        acc[ch.code] = ch;
        return acc;
      },
      {}
    ) || {};

  if (isLoading) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Store className="w-5 h-5 text-dark-500" />
          <h2 className="text-lg font-semibold text-dark-900 dark:text-white">
            Validação para Marketplaces
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
          <Store className="w-5 h-5 text-dark-500" />
          <h2 className="text-lg font-semibold text-dark-900 dark:text-white">
            Validação para Marketplaces
          </h2>
        </div>
        <p className="text-dark-500 dark:text-dark-400">
          Erro ao carregar validações
        </p>
      </div>
    );
  }

  const results = validationResults
    ? Object.entries(validationResults).map(([code, result]) => ({
        ...(result as ChannelValidationResult),
        channelCode: code,
      }))
    : [];

  const validCount = results.filter((r) => r.isValid).length;
  const totalCount = results.length;
  const averageScore = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
    : 0;

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5 text-dark-500" />
          <h2 className="text-lg font-semibold text-dark-900 dark:text-white">
            Validação para Marketplaces
          </h2>
          <span className="text-sm text-dark-500 dark:text-dark-400">
            ({validCount}/{totalCount} válidos • Score médio: {averageScore}%)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 hover:bg-dark-100 dark:hover:bg-dark-800 rounded-lg transition-colors"
            title="Revalidar"
          >
            <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
          </button>
          {results.length > 0 && (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {validCount}
          </div>
          <div className="text-sm text-green-700 dark:text-green-300">Canais Válidos</div>
        </div>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {totalCount - validCount}
          </div>
          <div className="text-sm text-red-700 dark:text-red-300">Canais Inválidos</div>
        </div>
        <div className={cn('p-4 rounded-lg text-center', getScoreBgColor(averageScore))}>
          <div className={cn('text-2xl font-bold', getScoreColor(averageScore))}>
            {averageScore}%
          </div>
          <div className="text-sm text-dark-600 dark:text-dark-300">Score Médio</div>
        </div>
      </div>

      {/* Channel Validation Results */}
      {results.length === 0 ? (
        <p className="text-dark-500 dark:text-dark-400 italic py-4">
          Nenhum resultado de validação disponível
        </p>
      ) : (
        <div className="space-y-3">
          {results.map((result) => (
            <ChannelValidationCard
              key={result.channelCode}
              result={result}
              channelInfo={channelsMap[result.channelCode]}
              isExpanded={expandedChannels.has(result.channelCode)}
              onToggle={() => toggleChannel(result.channelCode)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
