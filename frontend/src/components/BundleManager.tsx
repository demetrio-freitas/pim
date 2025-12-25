'use client';

import { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Trash2,
  GripVertical,
  Search,
  X,
  AlertCircle,
  DollarSign,
  Hash,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { BundleComponent, Product } from '@/types';
import { useDebounce } from '@/hooks/useDebounce';

interface BundleManagerProps {
  bundleId: string;
  components: BundleComponent[];
  onComponentsChange: (components: BundleComponent[]) => void;
  isLoading?: boolean;
}

export function BundleManager({
  bundleId,
  components,
  onComponentsChange,
  isLoading = false,
}: BundleManagerProps) {
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [editingComponent, setEditingComponent] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Search products
  useEffect(() => {
    const searchProducts = async () => {
      if (debouncedSearch.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await api.getProducts({ search: debouncedSearch, size: 10 });
        // Filter out products that are already in the bundle and bundles themselves
        const existingIds = components.map((c) => c.componentId);
        const filtered = response.content.filter(
          (p: Product) => !existingIds.includes(p.id) && p.type !== 'BUNDLE' && p.id !== bundleId
        );
        setSearchResults(filtered);
      } catch (error) {
        console.error('Error searching products:', error);
      } finally {
        setIsSearching(false);
      }
    };

    searchProducts();
  }, [debouncedSearch, components, bundleId]);

  // Add component to bundle
  const handleAddComponent = async (product: Product) => {
    setIsSaving(true);
    try {
      const response = await api.addBundleComponent(bundleId, {
        componentId: product.id,
        quantity: 1,
        position: components.length,
      });
      onComponentsChange([...components, response]);
      setShowProductSearch(false);
      setSearchQuery('');
    } catch (error) {
      console.error('Error adding component:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Update component
  const handleUpdateComponent = async (
    componentId: string,
    updates: { quantity?: number; specialPrice?: number | null }
  ) => {
    setIsSaving(true);
    try {
      const response = await api.updateBundleComponent(componentId, {
        ...updates,
        specialPrice: updates.specialPrice ?? undefined,
      });
      onComponentsChange(
        components.map((c) => (c.id === componentId ? response : c))
      );
      setEditingComponent(null);
    } catch (error) {
      console.error('Error updating component:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Remove component
  const handleRemoveComponent = async (componentId: string) => {
    setIsSaving(true);
    try {
      await api.removeBundleComponent(componentId);
      onComponentsChange(components.filter((c) => c.id !== componentId));
    } catch (error) {
      console.error('Error removing component:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate bundle total price
  const calculateTotal = () => {
    return components.reduce((total, comp) => {
      const price = comp.specialPrice ?? comp.componentPrice ?? 0;
      return total + price * comp.quantity;
    }, 0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-dark-900 dark:text-white">
            Componentes do Bundle
          </h3>
          <p className="text-sm text-dark-500">
            {components.length} produto{components.length !== 1 ? 's' : ''} no bundle
          </p>
        </div>
        <button
          onClick={() => setShowProductSearch(true)}
          className="flex items-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar Produto
        </button>
      </div>

      {/* Product Search Modal */}
      {showProductSearch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            {/* Search Header */}
            <div className="p-4 border-b border-dark-200 dark:border-dark-700">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-dark-900 dark:text-white">
                  Adicionar Produto ao Bundle
                </h4>
                <button
                  onClick={() => {
                    setShowProductSearch(false);
                    setSearchQuery('');
                  }}
                  className="p-1 hover:bg-dark-100 dark:hover:bg-dark-700 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nome ou SKU..."
                  className="w-full pl-10 pr-4 py-2 border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800"
                  autoFocus
                />
              </div>
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto p-2">
              {isSearching ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-1">
                  {searchResults.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleAddComponent(product)}
                      disabled={isSaving}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-dark-50 dark:hover:bg-dark-700 text-left transition-colors"
                    >
                      <div className="w-10 h-10 rounded bg-dark-100 dark:bg-dark-700 flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5 text-dark-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-dark-900 dark:text-white truncate">
                          {product.name}
                        </p>
                        <p className="text-sm text-dark-500">{product.sku}</p>
                      </div>
                      <span className="text-sm text-dark-600 dark:text-dark-400">
                        R$ {(product.price ?? 0).toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : searchQuery.length >= 2 ? (
                <div className="text-center p-8 text-dark-500">
                  Nenhum produto encontrado
                </div>
              ) : (
                <div className="text-center p-8 text-dark-500">
                  Digite pelo menos 2 caracteres para buscar
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Components List */}
      {components.length === 0 ? (
        <div className="p-8 text-center border-2 border-dashed border-dark-200 dark:border-dark-700 rounded-lg">
          <Package className="w-12 h-12 mx-auto mb-3 text-dark-300" />
          <p className="text-dark-500">Nenhum produto adicionado ao bundle</p>
          <button
            onClick={() => setShowProductSearch(true)}
            className="mt-3 text-primary-600 hover:text-primary-700 font-medium"
          >
            Adicionar primeiro produto
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {components.map((component, index) => (
            <div
              key={component.id}
              className="flex items-center gap-3 p-3 bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg"
            >
              {/* Drag Handle */}
              <GripVertical className="w-5 h-5 text-dark-300 cursor-grab flex-shrink-0" />

              {/* Position */}
              <span className="w-6 h-6 rounded bg-dark-100 dark:bg-dark-700 flex items-center justify-center text-xs font-medium text-dark-500">
                {index + 1}
              </span>

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-dark-900 dark:text-white truncate">
                  {component.componentName}
                </p>
                <p className="text-sm text-dark-500">{component.componentSku}</p>
              </div>

              {/* Quantity */}
              <div className="flex items-center gap-1">
                <Hash className="w-4 h-4 text-dark-400" />
                {editingComponent === component.id ? (
                  <input
                    type="number"
                    min="1"
                    defaultValue={component.quantity}
                    onBlur={(e) => {
                      const qty = parseInt(e.target.value) || 1;
                      if (qty !== component.quantity) {
                        handleUpdateComponent(component.id, { quantity: qty });
                      } else {
                        setEditingComponent(null);
                      }
                    }}
                    className="w-16 px-2 py-1 text-sm border border-dark-300 rounded"
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => setEditingComponent(component.id)}
                    className="px-2 py-1 text-sm font-medium text-dark-700 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700 rounded"
                  >
                    x{component.quantity}
                  </button>
                )}
              </div>

              {/* Price */}
              <div className="flex items-center gap-1 text-sm">
                <DollarSign className="w-4 h-4 text-dark-400" />
                <span className="text-dark-600 dark:text-dark-400">
                  {component.specialPrice !== null ? (
                    <>
                      <span className="line-through text-dark-400 mr-1">
                        R$ {(component.componentPrice ?? 0).toFixed(2)}
                      </span>
                      <span className="text-green-600">
                        R$ {component.specialPrice.toFixed(2)}
                      </span>
                    </>
                  ) : (
                    `R$ ${(component.componentPrice ?? 0).toFixed(2)}`
                  )}
                </span>
              </div>

              {/* Stock */}
              <div className={cn(
                'px-2 py-1 rounded text-xs font-medium',
                component.componentStock > 10
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : component.componentStock > 0
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              )}>
                {component.componentStock} em estoque
              </div>

              {/* Remove Button */}
              <button
                onClick={() => handleRemoveComponent(component.id)}
                disabled={isSaving}
                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Bundle Total */}
      {components.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-dark-50 dark:bg-dark-800 rounded-lg border border-dark-200 dark:border-dark-700">
          <span className="font-medium text-dark-700 dark:text-dark-300">
            Valor Total do Bundle:
          </span>
          <span className="text-xl font-bold text-dark-900 dark:text-white">
            R$ {calculateTotal().toFixed(2)}
          </span>
        </div>
      )}

      {/* Stock Warning */}
      {components.some((c) => c.componentStock === 0) && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-red-800 dark:text-red-200">
              Produtos sem estoque
            </h4>
            <p className="text-sm text-red-700 dark:text-red-300">
              Um ou mais produtos do bundle estão sem estoque. O bundle não poderá ser vendido.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
