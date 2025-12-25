'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { showSuccess, showError } from '@/lib/toast';
import {
  Package,
  Save,
  Loader2,
  Check,
  ToggleLeft,
  ToggleRight,
  Info,
  DollarSign,
  Warehouse,
  Truck,
  Search,
  Tag,
  Globe,
  AlertCircle,
  Image as ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Field type definition
interface ProductField {
  id: string;
  label: string;
  description: string;
  alwaysRequired?: boolean;
}

interface ProductFieldGroup {
  label: string;
  icon: any;
  fields: ProductField[];
}

// Define all product fields that can be made required
const productFields: Record<string, ProductFieldGroup> = {
  general: {
    label: 'Informações Gerais',
    icon: Package,
    fields: [
      { id: 'sku', label: 'SKU', description: 'Código único do produto', alwaysRequired: true },
      { id: 'name', label: 'Nome', description: 'Nome do produto', alwaysRequired: true },
      { id: 'description', label: 'Descrição Completa', description: 'Descrição detalhada do produto' },
      { id: 'shortDescription', label: 'Descrição Curta', description: 'Resumo do produto' },
      { id: 'brand', label: 'Marca', description: 'Marca ou vendor do produto' },
      { id: 'manufacturer', label: 'Fabricante', description: 'Nome do fabricante' },
      { id: 'productType', label: 'Tipo de Produto', description: 'Categoria do produto (ex: Clothing)' },
    ],
  },
  identifiers: {
    label: 'Identificadores',
    icon: Tag,
    fields: [
      { id: 'gtin', label: 'GTIN (EAN/UPC)', description: 'Código de barras global' },
      { id: 'mpn', label: 'MPN', description: 'Código do fabricante' },
      { id: 'barcode', label: 'Código de Barras', description: 'Código de barras interno' },
    ],
  },
  pricing: {
    label: 'Preços',
    icon: DollarSign,
    fields: [
      { id: 'price', label: 'Preço de Venda', description: 'Preço principal do produto' },
      { id: 'costPrice', label: 'Preço de Custo', description: 'Custo de aquisição' },
      { id: 'compareAtPrice', label: 'Preço Comparativo', description: 'Preço original (para desconto)' },
    ],
  },
  inventory: {
    label: 'Estoque',
    icon: Warehouse,
    fields: [
      { id: 'stockQuantity', label: 'Quantidade em Estoque', description: 'Quantidade disponível' },
      { id: 'minOrderQty', label: 'Quantidade Mínima', description: 'Mínimo por pedido' },
    ],
  },
  shipping: {
    label: 'Envio',
    icon: Truck,
    fields: [
      { id: 'weight', label: 'Peso', description: 'Peso do produto' },
      { id: 'length', label: 'Comprimento', description: 'Dimensão do produto' },
      { id: 'width', label: 'Largura', description: 'Dimensão do produto' },
      { id: 'height', label: 'Altura', description: 'Dimensão do produto' },
      { id: 'countryOfOrigin', label: 'País de Origem', description: 'Origem do produto' },
    ],
  },
  seo: {
    label: 'SEO',
    icon: Search,
    fields: [
      { id: 'urlKey', label: 'URL Amigável', description: 'Slug para URL' },
      { id: 'metaTitle', label: 'Meta Título', description: 'Título para SEO' },
      { id: 'metaDescription', label: 'Meta Descrição', description: 'Descrição para SEO' },
      { id: 'metaKeywords', label: 'Palavras-chave', description: 'Keywords para SEO' },
    ],
  },
  attributes: {
    label: 'Atributos',
    icon: Globe,
    fields: [
      { id: 'color', label: 'Cor', description: 'Cor do produto' },
      { id: 'size', label: 'Tamanho', description: 'Tamanho do produto' },
      { id: 'material', label: 'Material', description: 'Material do produto' },
      { id: 'gender', label: 'Gênero', description: 'Gênero alvo' },
    ],
  },
  media: {
    label: 'Mídia',
    icon: ImageIcon,
    fields: [
      { id: 'images', label: 'Imagens', description: 'Pelo menos uma imagem do produto' },
      { id: 'mainImage', label: 'Imagem Principal', description: 'Imagem de destaque do produto' },
    ],
  },
};

// Storage key for localStorage
const STORAGE_KEY = 'pim_required_fields';

// Get default required fields
const getDefaultRequiredFields = (): Record<string, boolean> => {
  const defaults: Record<string, boolean> = {};
  Object.values(productFields).forEach(group => {
    group.fields.forEach(field => {
      defaults[field.id] = field.alwaysRequired || false;
    });
  });
  return defaults;
};

// Get stored required fields
const getStoredRequiredFields = (): Record<string, boolean> => {
  if (typeof window === 'undefined') return getDefaultRequiredFields();
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return { ...getDefaultRequiredFields(), ...JSON.parse(stored) };
    } catch {
      return getDefaultRequiredFields();
    }
  }
  return getDefaultRequiredFields();
};

// Toggle Button Component
function ToggleButton({
  enabled,
  onChange,
  disabled
}: {
  enabled: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        enabled ? 'bg-primary-600' : 'bg-dark-300 dark:bg-dark-600',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
          enabled ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
}

export default function ProductSettingsPage() {
  const queryClient = useQueryClient();
  const [requiredFields, setRequiredFields] = useState<Record<string, boolean>>(getDefaultRequiredFields());
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const stored = getStoredRequiredFields();
    setRequiredFields(stored);
  }, []);

  const toggleField = (fieldId: string, alwaysRequired?: boolean) => {
    if (alwaysRequired) return;

    setRequiredFields(prev => {
      const updated = { ...prev, [fieldId]: !prev[fieldId] };
      setHasChanges(true);
      return updated;
    });
  };

  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requiredFields));

    // Dispatch event for other components to listen
    window.dispatchEvent(new CustomEvent('requiredFieldsChanged', { detail: requiredFields }));

    setSaved(true);
    setHasChanges(false);
    showSuccess('Configurações salvas com sucesso!');
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    const defaults = getDefaultRequiredFields();
    setRequiredFields(defaults);
    setHasChanges(true);
  };

  // Count required fields per group
  const getRequiredCount = (groupKey: string) => {
    const group = productFields[groupKey as keyof typeof productFields];
    return group.fields.filter(f => requiredFields[f.id]).length;
  };

  const totalRequired = Object.values(requiredFields).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white">
            Configurações de Produtos
          </h1>
          <p className="text-dark-500 dark:text-dark-400 mt-1">
            Defina quais campos são obrigatórios no formulário de produtos
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg">
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">Salvo!</span>
            </div>
          )}
          <button
            onClick={handleReset}
            className="btn-secondary"
          >
            Restaurar Padrões
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className={cn('btn-primary', !hasChanges && 'opacity-50 cursor-not-allowed')}
          >
            <Save className="w-4 h-4 mr-2" />
            Salvar Configurações
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <p className="text-blue-800 dark:text-blue-300 font-medium">
              Campos Obrigatórios
            </p>
            <p className="text-blue-700 dark:text-blue-400 text-sm mt-1">
              Os campos marcados como obrigatórios aparecerão com um asterisco (*) vermelho no formulário de produtos.
              O usuário não poderá salvar o produto sem preencher esses campos.
              <strong className="block mt-1">Total de campos obrigatórios: {totalRequired}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Field Groups */}
      <div className="space-y-6">
        {Object.entries(productFields).map(([groupKey, group]) => (
          <div key={groupKey} className="card">
            {/* Group Header */}
            <div className="p-4 border-b border-dark-100 dark:border-dark-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                  <group.icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-dark-900 dark:text-white">{group.label}</h3>
                  <p className="text-sm text-dark-500">{group.fields.length} campos</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-dark-500">
                  {getRequiredCount(groupKey)} obrigatório(s)
                </span>
                <span className={cn(
                  'px-2 py-1 rounded text-xs font-medium',
                  getRequiredCount(groupKey) > 0
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                    : 'bg-dark-100 text-dark-600 dark:bg-dark-800 dark:text-dark-400'
                )}>
                  {getRequiredCount(groupKey)}/{group.fields.length}
                </span>
              </div>
            </div>

            {/* Fields */}
            <div className="divide-y divide-dark-100 dark:divide-dark-800">
              {group.fields.map((field) => (
                <div
                  key={field.id}
                  className={cn(
                    'p-4 flex items-center justify-between hover:bg-dark-50 dark:hover:bg-dark-800/50 transition-colors',
                    field.alwaysRequired && 'bg-dark-50/50 dark:bg-dark-800/30'
                  )}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-dark-900 dark:text-white">
                        {field.label}
                      </span>
                      {field.alwaysRequired && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs rounded">
                          Sempre obrigatório
                        </span>
                      )}
                      {requiredFields[field.id] && !field.alwaysRequired && (
                        <span className="text-red-500 text-lg">*</span>
                      )}
                    </div>
                    <p className="text-sm text-dark-500 dark:text-dark-400 mt-0.5">
                      {field.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'text-sm',
                      requiredFields[field.id] ? 'text-primary-600 dark:text-primary-400' : 'text-dark-400'
                    )}>
                      {requiredFields[field.id] ? 'Obrigatório' : 'Opcional'}
                    </span>
                    <ToggleButton
                      enabled={requiredFields[field.id]}
                      onChange={() => toggleField(field.id, field.alwaysRequired)}
                      disabled={field.alwaysRequired}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Save Button */}
      {hasChanges && (
        <div className="sticky bottom-6 flex justify-center">
          <button
            onClick={handleSave}
            className="btn-primary shadow-lg px-8 py-3"
          >
            <Save className="w-5 h-5 mr-2" />
            Salvar Alterações
          </button>
        </div>
      )}
    </div>
  );
}

