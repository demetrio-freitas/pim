'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Trash2,
  Settings2,
  Package,
  X,
  ChevronDown,
  ChevronUp,
  Grid3X3,
  Check,
  Loader2,
  AlertCircle,
  RefreshCw,
  Copy,
  Edit3,
  Search,
  Filter,
  Download,
  Upload,
  MoreVertical,
  Image as ImageIcon,
  DollarSign,
  Boxes,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Sparkles,
  GripVertical,
  Percent,
  ArrowUpDown,
  ListChecks,
  PlayCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { showSuccess, showError } from '@/lib/toast';
import { formatCurrency } from '@/lib/utils';

interface VariantAxis {
  id: string;
  code: string;
  name: string;
  attributeId: string | null;
  attributeCode: string | null;
  attributeName: string | null;
  isActive: boolean;
  position: number;
  values?: AxisValue[];
}

interface AxisValue {
  id?: string;
  value: string;
  label?: string;
  colorCode?: string;
  imageUrl?: string;
}

interface AxisValueResponse {
  axisId: string;
  axisCode: string;
  axisName: string;
  value: string;
  label: string | null;
  colorCode: string | null;
  imageUrl: string | null;
}

interface ProductVariant {
  id: string;
  sku: string;
  name: string;
  price: number | null;
  status: string;
  stockQuantity: number;
  isInStock: boolean;
  axisValues: AxisValueResponse[];
  mainImage: string | null;
  isActive?: boolean;
}

interface VariantConfig {
  productId: string;
  axes: VariantAxis[];
  autoGenerateSku: boolean;
  skuPattern: string | null;
  variants: ProductVariant[];
}

interface VariantManagerProps {
  productId: string;
  productSku: string;
  productName: string;
  isNewProduct?: boolean;
  className?: string;
}

type GenerationMode = 'auto' | 'manual';
type ViewMode = 'table' | 'grid';

// Valores de exemplo para eixos comuns
const EXAMPLE_VALUES: Record<string, string[]> = {
  color: ['Azul', 'Vermelho', 'Verde', 'Preto', 'Branco'],
  cor: ['Azul', 'Vermelho', 'Verde', 'Preto', 'Branco'],
  size: ['PP', 'P', 'M', 'G', 'GG', 'XG'],
  tamanho: ['PP', 'P', 'M', 'G', 'GG', 'XG'],
  material: ['Algodao', 'Poliester', 'Linho', 'Seda'],
  voltage: ['110V', '220V', 'Bivolt'],
  voltagem: ['110V', '220V', 'Bivolt'],
};

export function VariantManager({
  productId,
  productSku,
  productName,
  isNewProduct = false,
  className,
}: VariantManagerProps) {
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showMatrixModal, setShowMatrixModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedAxes, setSelectedAxes] = useState<string[]>([]);
  const [axisValues, setAxisValues] = useState<Record<string, string[]>>({});
  const [skuPattern, setSkuPattern] = useState('{sku}-{axis1}-{axis2}');
  const [matrixValues, setMatrixValues] = useState<Record<string, string[]>>({});
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [generationMode, setGenerationMode] = useState<GenerationMode>('auto');
  const [manualSelections, setManualSelections] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Bulk action states
  const [bulkAction, setBulkAction] = useState<string>('');
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkStock, setBulkStock] = useState('');
  const [bulkPriceType, setBulkPriceType] = useState<'set' | 'increase' | 'decrease'>('set');
  const [bulkPriceMode, setBulkPriceMode] = useState<'value' | 'percent'>('value');

  // Fetch available variant axes
  const { data: axes, isLoading: axesLoading } = useQuery({
    queryKey: ['variant-axes'],
    queryFn: () => api.getActiveVariantAxes(),
  });

  // Fetch current variant configuration
  const { data: config, isLoading: configLoading, refetch: refetchConfig } = useQuery({
    queryKey: ['variant-config', productId],
    queryFn: () => api.getVariantConfig(productId),
    enabled: !!productId && !isNewProduct,
  });

  // Fetch product variants
  const { data: variants, isLoading: variantsLoading, refetch: refetchVariants } = useQuery({
    queryKey: ['product-variants', productId],
    queryFn: () => api.getProductVariants(productId),
    enabled: !!productId && !isNewProduct,
  });

  // Configure variants mutation
  const configureMutation = useMutation({
    mutationFn: (data: { axisIds: string[]; skuPattern?: string }) =>
      api.configureVariants(productId, data.axisIds, data.skuPattern),
    onSuccess: () => {
      showSuccess('Configuracao de variantes salva');
      setShowConfigModal(false);
      queryClient.invalidateQueries({ queryKey: ['variant-config', productId] });
      queryClient.invalidateQueries({ queryKey: ['product-variants', productId] });
    },
    onError: (error: any) => showError(error),
  });

  // Create variant mutation
  const createVariantMutation = useMutation({
    mutationFn: (data: { axisValues: Record<string, string>; sku?: string; price?: number; stockQuantity?: number }) =>
      api.createVariant(productId, data),
    onSuccess: () => {
      showSuccess('Variante criada com sucesso');
      queryClient.invalidateQueries({ queryKey: ['product-variants', productId] });
    },
    onError: (error: any) => showError(error),
  });

  // Update variant mutation
  const updateVariantMutation = useMutation({
    mutationFn: ({ variantId, data }: { variantId: string; data: any }) =>
      api.updateVariant(variantId, data),
    onSuccess: () => {
      showSuccess('Variante atualizada');
      setEditingVariant(null);
      setShowEditModal(false);
      queryClient.invalidateQueries({ queryKey: ['product-variants', productId] });
    },
    onError: (error: any) => showError(error),
  });

  // Delete variant mutation
  const deleteVariantMutation = useMutation({
    mutationFn: (variantId: string) => api.deleteVariant(variantId),
    onSuccess: () => {
      showSuccess('Variante removida');
      queryClient.invalidateQueries({ queryKey: ['product-variants', productId] });
    },
    onError: (error: any) => showError(error),
  });

  // Bulk create variants mutation
  const bulkCreateMutation = useMutation({
    mutationFn: (combinations: Record<string, string>[]) =>
      api.bulkCreateVariants(productId, combinations),
    onSuccess: (result) => {
      showSuccess(`${result.createdCount || 0} variantes criadas`);
      setShowMatrixModal(false);
      setMatrixValues({});
      queryClient.invalidateQueries({ queryKey: ['product-variants', productId] });
    },
    onError: (error: any) => showError(error),
  });

  // Initialize selected axes from config
  useEffect(() => {
    if (config?.axes) {
      setSelectedAxes(config.axes.map((a: VariantAxis) => a.id));
    }
    if (config?.skuPattern) {
      setSkuPattern(config.skuPattern);
    }
  }, [config]);

  // Handle axis selection
  const toggleAxis = (axisId: string) => {
    setSelectedAxes((prev) =>
      prev.includes(axisId)
        ? prev.filter((id) => id !== axisId)
        : [...prev, axisId]
    );
  };

  // Save configuration
  const handleSaveConfig = () => {
    configureMutation.mutate({ axisIds: selectedAxes, skuPattern });
  };

  // Generate combinations from matrix
  const generateCombinations = (): Record<string, string>[] => {
    const axisIds = Object.keys(matrixValues).filter(id => matrixValues[id]?.length > 0);
    if (axisIds.length === 0) return [];

    const combinations: Record<string, string>[] = [];

    const generate = (index: number, current: Record<string, string>) => {
      if (index === axisIds.length) {
        combinations.push({ ...current });
        return;
      }

      const axisId = axisIds[index];
      const values = matrixValues[axisId] || [];

      for (const value of values) {
        current[axisId] = value;
        generate(index + 1, current);
      }
    };

    generate(0, {});
    return combinations;
  };

  // Calculate preview combinations
  const previewCombinations = useMemo(() => {
    return generateCombinations();
  }, [matrixValues]);

  // Handle bulk create
  const handleBulkCreate = () => {
    let combinations = generateCombinations();

    if (generationMode === 'manual') {
      combinations = combinations.filter((_, idx) => manualSelections.has(idx.toString()));
    }

    if (combinations.length === 0) {
      showError('Selecione valores para pelo menos um eixo');
      return;
    }
    bulkCreateMutation.mutate(combinations);
  };

  // Get axis by ID
  const getAxisById = (id: string) => axes?.find((a: VariantAxis) => a.id === id);

  // Calculate combinations count
  const combinationsCount = Object.values(matrixValues).reduce(
    (acc, values) => acc * (values.length || 1),
    Object.keys(matrixValues).filter(k => matrixValues[k]?.length > 0).length > 0 ? 1 : 0
  );

  const isLoading = axesLoading || configLoading || variantsLoading;
  const hasVariants = variants && variants.length > 0;
  const hasConfig = config && config.axes?.length > 0;

  // Helper to get axis value from variant
  const getVariantAxisValue = (variant: ProductVariant, axisId: string): string => {
    const axisValue = variant.axisValues?.find((av: AxisValueResponse) => av.axisId === axisId);
    return axisValue?.value || '-';
  };

  // Get configured axis IDs
  const configuredAxisIds = config?.axes?.map((a: VariantAxis) => a.id) || [];

  // Filter variants
  const filteredVariants = useMemo(() => {
    if (!variants) return [];

    return variants.filter((variant: ProductVariant) => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSku = variant.sku.toLowerCase().includes(search);
        const matchesValues = variant.axisValues?.some(av =>
          av.value.toLowerCase().includes(search) ||
          av.label?.toLowerCase().includes(search)
        );
        if (!matchesSku && !matchesValues) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'active' && !variant.isActive) return false;
        if (statusFilter === 'inactive' && variant.isActive) return false;
      }

      // Stock filter
      if (stockFilter !== 'all') {
        if (stockFilter === 'in_stock' && variant.stockQuantity <= 0) return false;
        if (stockFilter === 'low_stock' && (variant.stockQuantity <= 0 || variant.stockQuantity > 10)) return false;
        if (stockFilter === 'out_of_stock' && variant.stockQuantity > 0) return false;
      }

      return true;
    });
  }, [variants, searchTerm, statusFilter, stockFilter]);

  // Get variant status indicator
  const getVariantStatus = (variant: ProductVariant) => {
    const issues: string[] = [];

    if (!variant.price || variant.price <= 0) issues.push('Sem preco');
    if (!variant.mainImage) issues.push('Sem imagem');
    if (variant.stockQuantity <= 0) issues.push('Sem estoque');

    if (issues.length === 0) {
      return { color: 'green', icon: CheckCircle2, label: 'Completa', issues: [] };
    } else if (variant.stockQuantity <= 0) {
      return { color: 'red', icon: XCircle, label: 'Esgotada', issues };
    } else if (variant.stockQuantity < 10) {
      return { color: 'yellow', icon: AlertTriangle, label: 'Estoque baixo', issues };
    } else {
      return { color: 'orange', icon: AlertCircle, label: 'Incompleta', issues };
    }
  };

  // Toggle variant selection
  const toggleVariantSelection = (variantId: string) => {
    setSelectedVariants(prev =>
      prev.includes(variantId)
        ? prev.filter(id => id !== variantId)
        : [...prev, variantId]
    );
  };

  // Select all variants
  const selectAllVariants = () => {
    if (selectedVariants.length === filteredVariants.length) {
      setSelectedVariants([]);
    } else {
      setSelectedVariants(filteredVariants.map((v: ProductVariant) => v.id));
    }
  };

  // Apply bulk action
  const applyBulkAction = async () => {
    if (selectedVariants.length === 0) {
      showError('Selecione pelo menos uma variante');
      return;
    }

    try {
      switch (bulkAction) {
        case 'set_price':
          if (!bulkPrice) {
            showError('Informe o preco');
            return;
          }
          const priceValue = parseFloat(bulkPrice);
          await Promise.all(
            selectedVariants.map(id => {
              const variant = variants?.find((v: ProductVariant) => v.id === id);
              let newPrice = priceValue;

              if (bulkPriceType === 'increase') {
                newPrice = bulkPriceMode === 'percent'
                  ? (variant?.price || 0) * (1 + priceValue / 100)
                  : (variant?.price || 0) + priceValue;
              } else if (bulkPriceType === 'decrease') {
                newPrice = bulkPriceMode === 'percent'
                  ? (variant?.price || 0) * (1 - priceValue / 100)
                  : (variant?.price || 0) - priceValue;
              }

              return api.updateVariant(id, { price: Math.max(0, newPrice) });
            })
          );
          showSuccess('Precos atualizados');
          break;

        case 'set_stock':
          if (!bulkStock) {
            showError('Informe o estoque');
            return;
          }
          await Promise.all(
            selectedVariants.map(id =>
              api.updateVariant(id, { stockQuantity: parseInt(bulkStock) })
            )
          );
          showSuccess('Estoque atualizado');
          break;

        case 'activate':
          await Promise.all(
            selectedVariants.map(id =>
              api.updateVariant(id, { isActive: true })
            )
          );
          showSuccess('Variantes ativadas');
          break;

        case 'deactivate':
          await Promise.all(
            selectedVariants.map(id =>
              api.updateVariant(id, { isActive: false })
            )
          );
          showSuccess('Variantes desativadas');
          break;

        case 'delete':
          if (!confirm(`Deseja excluir ${selectedVariants.length} variante(s)?`)) return;
          await Promise.all(
            selectedVariants.map(id => api.deleteVariant(id))
          );
          showSuccess('Variantes excluidas');
          break;
      }

      setSelectedVariants([]);
      setBulkAction('');
      setBulkPrice('');
      setBulkStock('');
      setShowBulkModal(false);
      refetchVariants();
    } catch (error) {
      showError(error as string);
    }
  };

  // Export variants to CSV
  const exportToCSV = () => {
    if (!variants || variants.length === 0) return;

    const headers = ['SKU', ...configuredAxisIds.map((id: string) => getAxisById(id)?.name || id), 'Preco', 'Estoque', 'Status'];
    const rows = variants.map((v: ProductVariant) => [
      v.sku,
      ...configuredAxisIds.map((id: string) => getVariantAxisValue(v, id)),
      v.price?.toString() || '',
      v.stockQuantity.toString(),
      v.isActive ? 'Ativo' : 'Inativo'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `variantes_${productSku}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Get example values for axis
  const getExampleValues = (axisCode: string): string[] => {
    const code = axisCode.toLowerCase();
    return EXAMPLE_VALUES[code] || [];
  };

  // Add quick values
  const addQuickValues = (axisId: string, values: string[]) => {
    setMatrixValues(prev => {
      const existingValues = prev[axisId] || [];
      const allValues = [...existingValues, ...values];
      const uniqueValues = allValues.filter((v, i, arr) => arr.indexOf(v) === i);
      return {
        ...prev,
        [axisId]: uniqueValues
      };
    });
  };

  return (
    <div className={cn('card overflow-hidden', className)}>
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-dark-50 dark:hover:bg-dark-800/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Grid3X3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-dark-900 dark:text-white">
              Variantes do Produto
            </h3>
            <p className="text-sm text-dark-500">
              {hasVariants
                ? `${variants.length} variante(s) configurada(s)`
                : hasConfig
                ? `Eixos: ${config.axes.map((a: VariantAxis) => a.name).join(', ')}`
                : 'Configure variantes como cor, tamanho, etc.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasConfig && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMatrixModal(true);
              }}
              className="btn-secondary text-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Gerar Variantes
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowConfigModal(true);
            }}
            className="btn-secondary text-sm flex items-center gap-1.5"
          >
            <Settings2 className="w-4 h-4" />
            Configurar
          </button>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-dark-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-dark-400" />
          )}
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-dark-100 dark:border-dark-800">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 mx-auto animate-spin text-primary-500" />
              <p className="text-sm text-dark-500 mt-2">Carregando variantes...</p>
            </div>
          ) : isNewProduct ? (
            /* New Product - Configuration Guide */
            <div className="p-6">
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-xl">
                    <Sparkles className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-dark-900 dark:text-white text-lg mb-2">
                      Configure as Variantes do Produto
                    </h4>
                    <p className="text-dark-600 dark:text-dark-400 mb-4">
                      Defina os atributos que geram variantes (como Cor e Tamanho) e
                      visualize quantas SKUs serao criadas antes de salvar.
                    </p>

                    {/* Quick Setup */}
                    <div className="bg-white dark:bg-dark-800 rounded-lg p-4 mb-4">
                      <h5 className="font-medium text-dark-700 dark:text-dark-300 mb-3 flex items-center gap-2">
                        <ListChecks className="w-4 h-4" />
                        Selecione os Atributos de Variacao
                      </h5>

                      {axesLoading ? (
                        <div className="text-center py-4">
                          <Loader2 className="w-5 h-5 mx-auto animate-spin" />
                        </div>
                      ) : axes && axes.length > 0 ? (
                        <div className="space-y-2">
                          {axes.map((axis: VariantAxis) => (
                            <label
                              key={axis.id}
                              className={cn(
                                'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                                selectedAxes.includes(axis.id)
                                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                  : 'border-dark-200 dark:border-dark-700 hover:border-purple-300'
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={selectedAxes.includes(axis.id)}
                                onChange={() => toggleAxis(axis.id)}
                                className="rounded border-dark-300 text-purple-600 focus:ring-purple-500"
                              />
                              <div className="flex-1">
                                <span className="font-medium text-dark-900 dark:text-white">
                                  {axis.name}
                                </span>
                                <span className="text-sm text-dark-500 ml-2">
                                  ({axis.code})
                                </span>
                              </div>
                              {selectedAxes.includes(axis.id) && (
                                <Check className="w-4 h-4 text-purple-600" />
                              )}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-dark-500">
                          <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Nenhum eixo de variante cadastrado</p>
                          <p className="text-xs mt-1">
                            Cadastre eixos em Configuracoes &gt; Eixos de Variantes
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Values Configuration */}
                    {selectedAxes.length > 0 && (
                      <div className="bg-white dark:bg-dark-800 rounded-lg p-4 mb-4">
                        <h5 className="font-medium text-dark-700 dark:text-dark-300 mb-3 flex items-center gap-2">
                          <Edit3 className="w-4 h-4" />
                          Defina os Valores para Cada Eixo
                        </h5>

                        <div className="space-y-4">
                          {selectedAxes.map(axisId => {
                            const axis = getAxisById(axisId);
                            if (!axis) return null;

                            const exampleVals = getExampleValues(axis.code);

                            return (
                              <div key={axisId} className="p-3 bg-dark-50 dark:bg-dark-700/50 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <label className="font-medium text-dark-700 dark:text-dark-300">
                                    {axis.name}
                                  </label>
                                  {exampleVals.length > 0 && (
                                    <button
                                      onClick={() => addQuickValues(axisId, exampleVals)}
                                      className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
                                    >
                                      <Sparkles className="w-3 h-3" />
                                      Adicionar sugestoes
                                    </button>
                                  )}
                                </div>

                                <div className="flex flex-wrap gap-2 mb-2">
                                  {(axisValues[axisId] || []).map((value, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-sm"
                                    >
                                      {value}
                                      <button
                                        onClick={() => {
                                          setAxisValues(prev => ({
                                            ...prev,
                                            [axisId]: prev[axisId].filter((_, i) => i !== idx),
                                          }));
                                        }}
                                        className="hover:text-red-500 ml-1"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </span>
                                  ))}
                                </div>

                                <input
                                  type="text"
                                  placeholder={`Digite e pressione Enter para adicionar ${axis.name.toLowerCase()}...`}
                                  className="input text-sm w-full"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const value = (e.target as HTMLInputElement).value.trim();
                                      if (value && !axisValues[axisId]?.includes(value)) {
                                        setAxisValues(prev => ({
                                          ...prev,
                                          [axisId]: [...(prev[axisId] || []), value],
                                        }));
                                        (e.target as HTMLInputElement).value = '';
                                      }
                                    }
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Preview */}
                    {selectedAxes.length > 0 && Object.values(axisValues).some(v => v?.length > 0) && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-start gap-3">
                          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-blue-700 dark:text-blue-300">
                              {Object.values(axisValues).reduce((acc, v) => acc * (v?.length || 1), 1)} variantes serao criadas
                            </p>
                            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                              {selectedAxes.map(id => {
                                const axis = getAxisById(id);
                                const count = axisValues[id]?.length || 0;
                                return `${count} ${axis?.name || id}`;
                              }).join(' x ')}
                            </p>
                            <p className="text-xs text-blue-500 dark:text-blue-500 mt-2">
                              As variantes serao geradas automaticamente ao salvar o produto
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-4 text-sm text-dark-500">
                      <Info className="w-4 h-4" />
                      <span>Salve o produto para gerar as variantes configuradas</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : !hasConfig ? (
            /* No Configuration - Setup Guide */
            <div className="p-6">
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-xl">
                    <Package className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-dark-900 dark:text-white text-lg mb-2">
                      Comece configurando os eixos de variacao
                    </h4>
                    <p className="text-dark-600 dark:text-dark-400 mb-4">
                      Variantes permitem criar diferentes versoes do mesmo produto,
                      como diferentes cores e tamanhos. Defina quais atributos geram variantes.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-white dark:bg-dark-800 p-4 rounded-lg">
                        <div className="text-2xl mb-2">1</div>
                        <h5 className="font-medium text-dark-800 dark:text-dark-200 mb-1">
                          Selecione os eixos
                        </h5>
                        <p className="text-sm text-dark-500">
                          Escolha atributos como Cor, Tamanho, Material
                        </p>
                      </div>
                      <div className="bg-white dark:bg-dark-800 p-4 rounded-lg">
                        <div className="text-2xl mb-2">2</div>
                        <h5 className="font-medium text-dark-800 dark:text-dark-200 mb-1">
                          Defina os valores
                        </h5>
                        <p className="text-sm text-dark-500">
                          Ex: Azul, Vermelho para Cor; P, M, G para Tamanho
                        </p>
                      </div>
                      <div className="bg-white dark:bg-dark-800 p-4 rounded-lg">
                        <div className="text-2xl mb-2">3</div>
                        <h5 className="font-medium text-dark-800 dark:text-dark-200 mb-1">
                          Gere as variantes
                        </h5>
                        <p className="text-sm text-dark-500">
                          O sistema cria todas as combinacoes automaticamente
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowConfigModal(true)}
                      className="btn-primary"
                    >
                      <Settings2 className="w-4 h-4 mr-2" />
                      Configurar Eixos de Variacao
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : !hasVariants ? (
            /* Has Config but No Variants */
            <div className="p-6">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-xl">
                    <PlayCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-dark-900 dark:text-white text-lg mb-2">
                      Pronto para gerar variantes!
                    </h4>
                    <p className="text-dark-600 dark:text-dark-400 mb-2">
                      Eixos configurados:{' '}
                      <span className="font-medium">
                        {config.axes.map((a: VariantAxis) => a.name).join(', ')}
                      </span>
                    </p>
                    <p className="text-sm text-dark-500 mb-4">
                      Defina os valores para cada eixo e gere todas as combinacoes de uma vez.
                    </p>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowMatrixModal(true)}
                        className="btn-primary"
                      >
                        <Grid3X3 className="w-4 h-4 mr-2" />
                        Gerar Variantes
                      </button>
                      <button
                        onClick={() => setShowConfigModal(true)}
                        className="btn-secondary"
                      >
                        <Settings2 className="w-4 h-4 mr-2" />
                        Editar Eixos
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Has Variants - Full Management Interface */
            <>
              {/* Toolbar */}
              <div className="p-4 bg-dark-50 dark:bg-dark-800/50 border-b border-dark-100 dark:border-dark-800">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Search */}
                  <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar por SKU ou valor..."
                      className="input pl-9 w-full"
                    />
                  </div>

                  {/* Filters */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="input w-auto"
                  >
                    <option value="all">Todos os status</option>
                    <option value="active">Ativos</option>
                    <option value="inactive">Inativos</option>
                  </select>

                  <select
                    value={stockFilter}
                    onChange={(e) => setStockFilter(e.target.value)}
                    className="input w-auto"
                  >
                    <option value="all">Todo estoque</option>
                    <option value="in_stock">Em estoque</option>
                    <option value="low_stock">Estoque baixo</option>
                    <option value="out_of_stock">Sem estoque</option>
                  </select>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={exportToCSV}
                      className="btn-secondary text-sm"
                      title="Exportar CSV"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    {selectedVariants.length > 0 && (
                      <button
                        onClick={() => setShowBulkModal(true)}
                        className="btn-secondary text-sm flex items-center gap-1.5"
                      >
                        <Settings2 className="w-4 h-4" />
                        Acoes em massa ({selectedVariants.length})
                      </button>
                    )}

                    <button
                      onClick={() => setShowMatrixModal(true)}
                      className="btn-primary text-sm flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar
                    </button>
                  </div>
                </div>
              </div>

              {/* Variants Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-dark-50 dark:bg-dark-800">
                    <tr>
                      <th className="table-header w-10">
                        <input
                          type="checkbox"
                          checked={selectedVariants.length === filteredVariants.length && filteredVariants.length > 0}
                          onChange={selectAllVariants}
                          className="rounded border-dark-300"
                        />
                      </th>
                      <th className="table-header w-10">Img</th>
                      <th className="table-header">SKU</th>
                      {configuredAxisIds.map((axisId: string) => (
                        <th key={axisId} className="table-header">
                          {getAxisById(axisId)?.name || axisId}
                        </th>
                      ))}
                      <th className="table-header">Preco</th>
                      <th className="table-header">Estoque</th>
                      <th className="table-header">Status</th>
                      <th className="table-header text-right">Acoes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-100 dark:divide-dark-800">
                    {filteredVariants.map((variant: ProductVariant) => {
                      const status = getVariantStatus(variant);
                      const StatusIcon = status.icon;

                      return (
                        <tr
                          key={variant.id}
                          className={cn(
                            'hover:bg-dark-50 dark:hover:bg-dark-800/50 transition-colors',
                            selectedVariants.includes(variant.id) && 'bg-purple-50 dark:bg-purple-900/10'
                          )}
                        >
                          <td className="table-cell">
                            <input
                              type="checkbox"
                              checked={selectedVariants.includes(variant.id)}
                              onChange={() => toggleVariantSelection(variant.id)}
                              className="rounded border-dark-300"
                            />
                          </td>
                          <td className="table-cell">
                            <div className="w-10 h-10 bg-dark-100 dark:bg-dark-700 rounded-lg flex items-center justify-center overflow-hidden">
                              {variant.mainImage ? (
                                <img
                                  src={variant.mainImage}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <ImageIcon className="w-4 h-4 text-dark-400" />
                              )}
                            </div>
                          </td>
                          <td className="table-cell font-mono text-sm">
                            {variant.sku}
                          </td>
                          {configuredAxisIds.map((axisId: string) => (
                            <td key={axisId} className="table-cell">
                              <span className="badge badge-default">
                                {getVariantAxisValue(variant, axisId)}
                              </span>
                            </td>
                          ))}
                          <td className="table-cell">
                            <span className={cn(
                              'font-medium',
                              !variant.price && 'text-dark-400 italic'
                            )}>
                              {variant.price ? formatCurrency(variant.price) : 'Sem preco'}
                            </span>
                          </td>
                          <td className="table-cell">
                            <span
                              className={cn(
                                'font-medium',
                                variant.stockQuantity <= 0
                                  ? 'text-red-600'
                                  : variant.stockQuantity < 10
                                  ? 'text-orange-600'
                                  : 'text-green-600'
                              )}
                            >
                              {variant.stockQuantity}
                            </span>
                          </td>
                          <td className="table-cell">
                            <div className="flex items-center gap-1.5" title={status.issues.join(', ')}>
                              <StatusIcon className={cn(
                                'w-4 h-4',
                                status.color === 'green' && 'text-green-500',
                                status.color === 'yellow' && 'text-yellow-500',
                                status.color === 'orange' && 'text-orange-500',
                                status.color === 'red' && 'text-red-500',
                              )} />
                              <span className={cn(
                                'text-sm',
                                status.color === 'green' && 'text-green-600',
                                status.color === 'yellow' && 'text-yellow-600',
                                status.color === 'orange' && 'text-orange-600',
                                status.color === 'red' && 'text-red-600',
                              )}>
                                {status.label}
                              </span>
                            </div>
                          </td>
                          <td className="table-cell text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setEditingVariant(variant);
                                  setShowEditModal(true);
                                }}
                                className="p-2 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
                                title="Editar"
                              >
                                <Edit3 className="w-4 h-4 text-dark-500" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Deseja remover esta variante?')) {
                                    deleteVariantMutation.mutate(variant.id);
                                  }
                                }}
                                disabled={deleteVariantMutation.isPending}
                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary Footer */}
              <div className="p-4 bg-dark-50 dark:bg-dark-800/50 border-t border-dark-100 dark:border-dark-800">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-500">
                    Mostrando {filteredVariants.length} de {variants.length} variantes
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-dark-600 dark:text-dark-400">
                        {variants.filter((v: ProductVariant) => v.stockQuantity > 10 && v.price).length} completas
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      <span className="text-dark-600 dark:text-dark-400">
                        {variants.filter((v: ProductVariant) => v.stockQuantity > 0 && v.stockQuantity <= 10).length} estoque baixo
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="text-dark-600 dark:text-dark-400">
                        {variants.filter((v: ProductVariant) => v.stockQuantity <= 0).length} esgotadas
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-dark-200 dark:border-dark-700">
              <h3 className="text-lg font-semibold text-dark-900 dark:text-white flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-purple-500" />
                Configurar Eixos de Variantes
              </h3>
              <p className="text-sm text-dark-500 mt-1">
                Selecione os eixos que definem as variantes do produto
              </p>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                  Eixos Disponiveis
                </label>
                {axesLoading ? (
                  <div className="text-center py-4">
                    <Loader2 className="w-5 h-5 mx-auto animate-spin text-dark-400" />
                  </div>
                ) : axes && axes.length > 0 ? (
                  <div className="space-y-2">
                    {axes.map((axis: VariantAxis) => (
                      <label
                        key={axis.id}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                          selectedAxes.includes(axis.id)
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-dark-200 dark:border-dark-700 hover:bg-dark-50 dark:hover:bg-dark-700'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selectedAxes.includes(axis.id)}
                          onChange={() => toggleAxis(axis.id)}
                          className="rounded border-dark-300 text-purple-600 focus:ring-purple-500"
                        />
                        <div className="flex-1">
                          <span className="font-medium text-dark-900 dark:text-white">
                            {axis.name}
                          </span>
                          <span className="text-sm text-dark-500 ml-2">
                            ({axis.code})
                          </span>
                        </div>
                        {selectedAxes.includes(axis.id) && (
                          <Check className="w-4 h-4 text-purple-600" />
                        )}
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-dark-500">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhum eixo de variante cadastrado</p>
                    <p className="text-sm mt-1">
                      Cadastre eixos em Configuracoes &gt; Eixos de Variantes
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                  Padrao de SKU
                </label>
                <input
                  type="text"
                  value={skuPattern}
                  onChange={(e) => setSkuPattern(e.target.value)}
                  placeholder="{sku}-{axis1}-{axis2}"
                  className="input w-full"
                />
                <p className="text-xs text-dark-500 mt-1">
                  Variaveis: {'{sku}'}, {'{axis1}'}, {'{axis2}'}, etc.
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-dark-200 dark:border-dark-700 flex justify-end gap-3">
              <button
                onClick={() => setShowConfigModal(false)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={configureMutation.isPending || selectedAxes.length === 0}
                className="btn-primary disabled:opacity-50"
              >
                {configureMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Configuracao'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Matrix Generation Modal */}
      {showMatrixModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-dark-200 dark:border-dark-700">
              <h3 className="text-lg font-semibold text-dark-900 dark:text-white flex items-center gap-2">
                <Grid3X3 className="w-5 h-5 text-purple-500" />
                Gerar Variantes
              </h3>
              <p className="text-sm text-dark-500 mt-1">
                Defina os valores para cada eixo e visualize as combinacoes
              </p>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              {/* Axis Values */}
              {configuredAxisIds.map((axisId: string) => {
                const axis = getAxisById(axisId);
                if (!axis) return null;

                const exampleVals = getExampleValues(axis.code);

                return (
                  <div key={axisId} className="p-4 bg-dark-50 dark:bg-dark-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <label className="font-medium text-dark-700 dark:text-dark-300 flex items-center gap-2">
                        {axis.name}
                        <span className="text-xs text-dark-400">
                          ({matrixValues[axisId]?.length || 0} valores)
                        </span>
                      </label>
                      {exampleVals.length > 0 && (
                        <button
                          onClick={() => addQuickValues(axisId, exampleVals)}
                          className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          Sugestoes
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {(matrixValues[axisId] || []).map((value, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-sm font-medium"
                        >
                          {value}
                          <button
                            onClick={() => {
                              setMatrixValues((prev) => ({
                                ...prev,
                                [axisId]: prev[axisId].filter((_, i) => i !== idx),
                              }));
                            }}
                            className="hover:text-red-500 ml-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>

                    <input
                      type="text"
                      placeholder={`Digite e pressione Enter para adicionar ${axis.name.toLowerCase()}...`}
                      className="input text-sm w-full"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const value = (e.target as HTMLInputElement).value.trim();
                          if (value && !matrixValues[axisId]?.includes(value)) {
                            setMatrixValues((prev) => ({
                              ...prev,
                              [axisId]: [...(prev[axisId] || []), value],
                            }));
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />
                  </div>
                );
              })}

              {/* Generation Options */}
              {combinationsCount > 0 && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-blue-700 dark:text-blue-300">
                          {combinationsCount} variantes serao criadas
                        </p>
                        <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                          {configuredAxisIds.map((id: string) => {
                            const axis = getAxisById(id);
                            const count = matrixValues[id]?.length || 0;
                            return `${count} ${axis?.name || id}`;
                          }).join(' x ')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Generation Mode Selection */}
                  <div className="grid grid-cols-2 gap-4">
                    <label
                      className={cn(
                        'p-4 rounded-lg border-2 cursor-pointer transition-all',
                        generationMode === 'auto'
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-dark-200 dark:border-dark-700 hover:border-purple-300'
                      )}
                    >
                      <input
                        type="radio"
                        name="generationMode"
                        value="auto"
                        checked={generationMode === 'auto'}
                        onChange={() => setGenerationMode('auto')}
                        className="sr-only"
                      />
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                          generationMode === 'auto'
                            ? 'border-purple-500 bg-purple-500'
                            : 'border-dark-300'
                        )}>
                          {generationMode === 'auto' && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <div>
                          <h5 className="font-medium text-dark-900 dark:text-white">
                            Automatica (Recomendado)
                          </h5>
                          <p className="text-sm text-dark-500 mt-1">
                            Gera todas as {combinationsCount} combinacoes possiveis
                          </p>
                        </div>
                      </div>
                    </label>

                    <label
                      className={cn(
                        'p-4 rounded-lg border-2 cursor-pointer transition-all',
                        generationMode === 'manual'
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-dark-200 dark:border-dark-700 hover:border-purple-300'
                      )}
                    >
                      <input
                        type="radio"
                        name="generationMode"
                        value="manual"
                        checked={generationMode === 'manual'}
                        onChange={() => setGenerationMode('manual')}
                        className="sr-only"
                      />
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                          generationMode === 'manual'
                            ? 'border-purple-500 bg-purple-500'
                            : 'border-dark-300'
                        )}>
                          {generationMode === 'manual' && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <div>
                          <h5 className="font-medium text-dark-900 dark:text-white">
                            Manual
                          </h5>
                          <p className="text-sm text-dark-500 mt-1">
                            Escolha quais combinacoes criar
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Manual Selection List */}
                  {generationMode === 'manual' && previewCombinations.length > 0 && (
                    <div className="border border-dark-200 dark:border-dark-700 rounded-lg max-h-60 overflow-y-auto">
                      <div className="p-2 bg-dark-50 dark:bg-dark-800 border-b border-dark-200 dark:border-dark-700 sticky top-0">
                        <label className="flex items-center gap-2 text-sm font-medium text-dark-700 dark:text-dark-300">
                          <input
                            type="checkbox"
                            checked={manualSelections.size === previewCombinations.length}
                            onChange={() => {
                              if (manualSelections.size === previewCombinations.length) {
                                setManualSelections(new Set());
                              } else {
                                setManualSelections(new Set(previewCombinations.map((_, i) => i.toString())));
                              }
                            }}
                            className="rounded border-dark-300"
                          />
                          Selecionar todas ({manualSelections.size}/{previewCombinations.length})
                        </label>
                      </div>
                      <div className="divide-y divide-dark-100 dark:divide-dark-800">
                        {previewCombinations.map((combo, idx) => (
                          <label
                            key={idx}
                            className="flex items-center gap-3 p-3 hover:bg-dark-50 dark:hover:bg-dark-700/50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={manualSelections.has(idx.toString())}
                              onChange={() => {
                                setManualSelections(prev => {
                                  const next = new Set(prev);
                                  if (next.has(idx.toString())) {
                                    next.delete(idx.toString());
                                  } else {
                                    next.add(idx.toString());
                                  }
                                  return next;
                                });
                              }}
                              className="rounded border-dark-300"
                            />
                            <span className="text-sm text-dark-700 dark:text-dark-300">
                              {Object.entries(combo).map(([axisId, value]) => {
                                const axis = getAxisById(axisId);
                                return `${axis?.name || axisId}: ${value}`;
                              }).join(' / ')}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-dark-200 dark:border-dark-700 flex justify-between">
              <button
                onClick={() => {
                  setShowMatrixModal(false);
                  setMatrixValues({});
                  setManualSelections(new Set());
                }}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkCreate}
                disabled={bulkCreateMutation.isPending || combinationsCount === 0 || (generationMode === 'manual' && manualSelections.size === 0)}
                className="btn-primary disabled:opacity-50"
              >
                {bulkCreateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1.5" />
                    Gerar {generationMode === 'manual' ? manualSelections.size : combinationsCount} Variante(s)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Variant Modal */}
      {showEditModal && editingVariant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-dark-200 dark:border-dark-700">
              <h3 className="text-lg font-semibold text-dark-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-purple-500" />
                Editar Variante
              </h3>
              <p className="text-sm text-dark-500 mt-1 font-mono">
                {editingVariant.sku}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Variant Values Display */}
              <div className="flex flex-wrap gap-2 p-3 bg-dark-50 dark:bg-dark-700/50 rounded-lg">
                {editingVariant.axisValues?.map((av, idx) => (
                  <span key={idx} className="badge badge-primary">
                    {av.axisName}: {av.value}
                  </span>
                ))}
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                  Preco
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                  <input
                    type="number"
                    value={editingVariant.price || ''}
                    onChange={(e) => setEditingVariant({
                      ...editingVariant,
                      price: e.target.value ? parseFloat(e.target.value) : null
                    })}
                    className="input pl-9 w-full"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Stock */}
              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                  Estoque
                </label>
                <div className="relative">
                  <Boxes className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                  <input
                    type="number"
                    value={editingVariant.stockQuantity}
                    onChange={(e) => setEditingVariant({
                      ...editingVariant,
                      stockQuantity: parseInt(e.target.value) || 0
                    })}
                    className="input pl-9 w-full"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* SKU */}
              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                  SKU
                </label>
                <input
                  type="text"
                  value={editingVariant.sku}
                  onChange={(e) => setEditingVariant({
                    ...editingVariant,
                    sku: e.target.value
                  })}
                  className="input w-full font-mono"
                />
              </div>
            </div>

            <div className="p-6 border-t border-dark-200 dark:border-dark-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setEditingVariant(null);
                  setShowEditModal(false);
                }}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  updateVariantMutation.mutate({
                    variantId: editingVariant.id,
                    data: {
                      price: editingVariant.price,
                      stockQuantity: editingVariant.stockQuantity,
                      sku: editingVariant.sku,
                    }
                  });
                }}
                disabled={updateVariantMutation.isPending}
                className="btn-primary"
              >
                {updateVariantMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-dark-200 dark:border-dark-700">
              <h3 className="text-lg font-semibold text-dark-900 dark:text-white flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-purple-500" />
                Acoes em Massa
              </h3>
              <p className="text-sm text-dark-500 mt-1">
                {selectedVariants.length} variante(s) selecionada(s)
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                  Acao
                </label>
                <select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  className="input w-full"
                >
                  <option value="">Selecione uma acao...</option>
                  <option value="set_price">Definir preco</option>
                  <option value="set_stock">Definir estoque</option>
                  <option value="activate">Ativar</option>
                  <option value="deactivate">Desativar</option>
                  <option value="delete">Excluir</option>
                </select>
              </div>

              {bulkAction === 'set_price' && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setBulkPriceType('set')}
                      className={cn(
                        'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors',
                        bulkPriceType === 'set'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                          : 'bg-dark-100 text-dark-600 dark:bg-dark-700 dark:text-dark-400'
                      )}
                    >
                      Definir
                    </button>
                    <button
                      onClick={() => setBulkPriceType('increase')}
                      className={cn(
                        'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors',
                        bulkPriceType === 'increase'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-dark-100 text-dark-600 dark:bg-dark-700 dark:text-dark-400'
                      )}
                    >
                      Aumentar
                    </button>
                    <button
                      onClick={() => setBulkPriceType('decrease')}
                      className={cn(
                        'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors',
                        bulkPriceType === 'decrease'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-dark-100 text-dark-600 dark:bg-dark-700 dark:text-dark-400'
                      )}
                    >
                      Diminuir
                    </button>
                  </div>

                  {bulkPriceType !== 'set' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setBulkPriceMode('value')}
                        className={cn(
                          'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1',
                          bulkPriceMode === 'value'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-dark-100 text-dark-600'
                        )}
                      >
                        <DollarSign className="w-4 h-4" />
                        Valor
                      </button>
                      <button
                        onClick={() => setBulkPriceMode('percent')}
                        className={cn(
                          'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1',
                          bulkPriceMode === 'percent'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-dark-100 text-dark-600'
                        )}
                      >
                        <Percent className="w-4 h-4" />
                        Percentual
                      </button>
                    </div>
                  )}

                  <div className="relative">
                    {bulkPriceMode === 'value' ? (
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                    ) : (
                      <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                    )}
                    <input
                      type="number"
                      value={bulkPrice}
                      onChange={(e) => setBulkPrice(e.target.value)}
                      className="input pl-9 w-full"
                      placeholder={bulkPriceMode === 'value' ? '0.00' : '0'}
                      step={bulkPriceMode === 'value' ? '0.01' : '1'}
                    />
                  </div>
                </div>
              )}

              {bulkAction === 'set_stock' && (
                <div>
                  <div className="relative">
                    <Boxes className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                    <input
                      type="number"
                      value={bulkStock}
                      onChange={(e) => setBulkStock(e.target.value)}
                      className="input pl-9 w-full"
                      placeholder="Quantidade"
                    />
                  </div>
                </div>
              )}

              {bulkAction === 'delete' && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-red-700 dark:text-red-300">
                        Atencao!
                      </p>
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        Esta acao ira excluir permanentemente {selectedVariants.length} variante(s).
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-dark-200 dark:border-dark-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkAction('');
                  setBulkPrice('');
                  setBulkStock('');
                }}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={applyBulkAction}
                disabled={!bulkAction}
                className={cn(
                  'btn-primary disabled:opacity-50',
                  bulkAction === 'delete' && 'bg-red-600 hover:bg-red-700'
                )}
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
