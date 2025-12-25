'use client';

import { useState, useEffect } from 'react';
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
  className?: string;
}

export function VariantManager({
  productId,
  productSku,
  productName,
  className,
}: VariantManagerProps) {
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showMatrixModal, setShowMatrixModal] = useState(false);
  const [selectedAxes, setSelectedAxes] = useState<string[]>([]);
  const [skuPattern, setSkuPattern] = useState('{sku}-{axis1}-{axis2}');
  const [matrixValues, setMatrixValues] = useState<Record<string, string[]>>({});
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkStock, setBulkStock] = useState('');

  // Fetch available variant axes
  const { data: axes, isLoading: axesLoading } = useQuery({
    queryKey: ['variant-axes'],
    queryFn: () => api.getActiveVariantAxes(),
  });

  // Fetch current variant configuration
  const { data: config, isLoading: configLoading, refetch: refetchConfig } = useQuery({
    queryKey: ['variant-config', productId],
    queryFn: () => api.getVariantConfig(productId),
    enabled: !!productId,
  });

  // Fetch product variants
  const { data: variants, isLoading: variantsLoading, refetch: refetchVariants } = useQuery({
    queryKey: ['product-variants', productId],
    queryFn: () => api.getProductVariants(productId),
    enabled: !!productId,
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
    const axisIds = Object.keys(matrixValues);
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

  // Handle bulk create
  const handleBulkCreate = () => {
    const combinations = generateCombinations();
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
    Object.keys(matrixValues).length > 0 ? 1 : 0
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
          ) : !hasConfig ? (
            <div className="p-8 text-center">
              <Package className="w-12 h-12 mx-auto text-dark-300 mb-3" />
              <h4 className="font-medium text-dark-700 dark:text-dark-300">
                Nenhum eixo de variante configurado
              </h4>
              <p className="text-sm text-dark-500 mt-1 mb-4">
                Configure eixos como Cor, Tamanho, etc. para criar variantes
              </p>
              <button
                onClick={() => setShowConfigModal(true)}
                className="btn-primary text-sm"
              >
                <Settings2 className="w-4 h-4 mr-1.5" />
                Configurar Eixos
              </button>
            </div>
          ) : !hasVariants ? (
            <div className="p-8 text-center">
              <Grid3X3 className="w-12 h-12 mx-auto text-dark-300 mb-3" />
              <h4 className="font-medium text-dark-700 dark:text-dark-300">
                Nenhuma variante criada
              </h4>
              <p className="text-sm text-dark-500 mt-1 mb-4">
                Eixos configurados:{' '}
                {config.axes
                  .map((a: VariantAxis) => a.name)
                  .filter(Boolean)
                  .join(', ')}
              </p>
              <button
                onClick={() => setShowMatrixModal(true)}
                className="btn-primary text-sm"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Gerar Variantes
              </button>
            </div>
          ) : (
            <>
              {/* Variants Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-dark-50 dark:bg-dark-800">
                    <tr>
                      <th className="table-header">SKU</th>
                      {configuredAxisIds.map((axisId: string) => (
                        <th key={axisId} className="table-header">
                          {getAxisById(axisId)?.name || axisId}
                        </th>
                      ))}
                      <th className="table-header">Preco</th>
                      <th className="table-header">Estoque</th>
                      <th className="table-header text-right">Acoes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-100 dark:divide-dark-800">
                    {variants.map((variant: ProductVariant) => (
                      <tr
                        key={variant.id}
                        className="hover:bg-dark-50 dark:hover:bg-dark-800/50"
                      >
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
                          {editingVariant?.id === variant.id ? (
                            <input
                              type="number"
                              value={editingVariant.price || ''}
                              onChange={(e) =>
                                setEditingVariant({
                                  ...editingVariant,
                                  price: e.target.value ? parseFloat(e.target.value) : null,
                                })
                              }
                              className="input w-24 text-sm"
                              step="0.01"
                            />
                          ) : (
                            formatCurrency(variant.price)
                          )}
                        </td>
                        <td className="table-cell">
                          {editingVariant?.id === variant.id ? (
                            <input
                              type="number"
                              value={editingVariant.stockQuantity}
                              onChange={(e) =>
                                setEditingVariant({
                                  ...editingVariant,
                                  stockQuantity: parseInt(e.target.value) || 0,
                                })
                              }
                              className="input w-20 text-sm"
                            />
                          ) : (
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
                          )}
                        </td>
                        <td className="table-cell text-right">
                          <div className="flex items-center justify-end gap-1">
                            {editingVariant?.id === variant.id ? (
                              <>
                                <button
                                  onClick={() => {
                                    updateVariantMutation.mutate({
                                      variantId: variant.id,
                                      data: {
                                        price: editingVariant.price,
                                        stockQuantity: editingVariant.stockQuantity,
                                      },
                                    });
                                  }}
                                  disabled={updateVariantMutation.isPending}
                                  className="p-2 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                                >
                                  {updateVariantMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-green-500" />
                                  ) : (
                                    <Check className="w-4 h-4 text-green-500" />
                                  )}
                                </button>
                                <button
                                  onClick={() => setEditingVariant(null)}
                                  className="p-2 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
                                >
                                  <X className="w-4 h-4 text-dark-500" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => setEditingVariant(variant)}
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
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bulk Actions */}
              <div className="p-4 bg-dark-50 dark:bg-dark-800/50 border-t border-dark-100 dark:border-dark-800">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-dark-700 dark:text-dark-300">
                    Atualizar todas:
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={bulkPrice}
                      onChange={(e) => setBulkPrice(e.target.value)}
                      placeholder="Preco"
                      className="input w-28 text-sm"
                      step="0.01"
                    />
                    <input
                      type="number"
                      value={bulkStock}
                      onChange={(e) => setBulkStock(e.target.value)}
                      placeholder="Estoque"
                      className="input w-24 text-sm"
                    />
                    <button
                      onClick={() => {
                        if (!bulkPrice && !bulkStock) {
                          showError('Preencha pelo menos um campo');
                          return;
                        }
                        const updates: any = {};
                        if (bulkPrice) updates.price = parseFloat(bulkPrice);
                        if (bulkStock) updates.stockQuantity = parseInt(bulkStock);

                        // Update all variants
                        Promise.all(
                          variants.map((v: ProductVariant) =>
                            api.updateVariant(v.id, updates)
                          )
                        ).then(() => {
                          showSuccess('Variantes atualizadas');
                          setBulkPrice('');
                          setBulkStock('');
                          refetchVariants();
                        });
                      }}
                      className="btn-primary text-sm"
                    >
                      Aplicar
                    </button>
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
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-dark-200 dark:border-dark-700">
              <h3 className="text-lg font-semibold text-dark-900 dark:text-white flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary-500" />
                Configurar Eixos de Variantes
              </h3>
              <p className="text-sm text-dark-500 mt-1">
                Selecione os eixos que definem as variantes do produto
              </p>
            </div>
            <div className="p-6 space-y-4">
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
                          'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                          selectedAxes.includes(axis.id)
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-dark-200 dark:border-dark-700 hover:bg-dark-50 dark:hover:bg-dark-700'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selectedAxes.includes(axis.id)}
                          onChange={() => toggleAxis(axis.id)}
                          className="rounded border-dark-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div>
                          <span className="font-medium text-dark-900 dark:text-white">
                            {axis.name}
                          </span>
                          <span className="text-sm text-dark-500 ml-2">
                            ({axis.code})
                          </span>
                        </div>
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
                className="px-4 py-2 text-dark-700 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-dark-200 dark:border-dark-700">
              <h3 className="text-lg font-semibold text-dark-900 dark:text-white flex items-center gap-2">
                <Grid3X3 className="w-5 h-5 text-primary-500" />
                Gerar Variantes
              </h3>
              <p className="text-sm text-dark-500 mt-1">
                Defina os valores para cada eixo e gere todas as combinacoes
              </p>
            </div>
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              {configuredAxisIds.map((axisId: string) => {
                const axis = getAxisById(axisId);
                if (!axis) return null;

                return (
                  <div key={axisId}>
                    <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                      {axis.name}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(matrixValues[axisId] || []).map((value, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full text-sm"
                        >
                          {value}
                          <button
                            onClick={() => {
                              setMatrixValues((prev) => ({
                                ...prev,
                                [axisId]: prev[axisId].filter((_, i) => i !== idx),
                              }));
                            }}
                            className="hover:text-red-500"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        placeholder={`Adicionar ${axis.name.toLowerCase()}...`}
                        className="input text-sm px-3 py-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const value = (e.target as HTMLInputElement).value.trim();
                            if (value) {
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
                    <p className="text-xs text-dark-500 mt-1">
                      Pressione Enter para adicionar valores
                    </p>
                  </div>
                );
              })}

              {/* Preview */}
              {combinationsCount > 0 && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    {combinationsCount} variante(s) serao criadas
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    SKU base: {productSku}
                  </p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-dark-200 dark:border-dark-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowMatrixModal(false);
                  setMatrixValues({});
                }}
                className="px-4 py-2 text-dark-700 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkCreate}
                disabled={bulkCreateMutation.isPending || combinationsCount === 0}
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
                    Gerar {combinationsCount} Variante(s)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
