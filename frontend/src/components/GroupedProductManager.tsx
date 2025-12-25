'use client';

import { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Trash2,
  GripVertical,
  Search,
  X,
  Users,
  DollarSign,
  Loader2,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { GroupedProductItem, Product } from '@/types';
import { useDebounce } from '@/hooks/useDebounce';

interface GroupedProductManagerProps {
  parentId: string;
  items: GroupedProductItem[];
  onItemsChange: (items: GroupedProductItem[]) => void;
  isLoading?: boolean;
}

export function GroupedProductManager({
  parentId,
  items,
  onItemsChange,
  isLoading = false,
}: GroupedProductManagerProps) {
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
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
        // Filter out products that are already in the group and grouped products themselves
        const existingIds = items.map((item) => item.childId);
        const filtered = response.content.filter(
          (p: Product) => !existingIds.includes(p.id) && p.type !== 'GROUPED' && p.id !== parentId
        );
        setSearchResults(filtered);
      } catch (error) {
        console.error('Error searching products:', error);
      } finally {
        setIsSearching(false);
      }
    };

    searchProducts();
  }, [debouncedSearch, items, parentId]);

  // Add item to group
  const handleAddItem = async (product: Product) => {
    setIsSaving(true);
    try {
      const response = await api.addGroupedItem(parentId, {
        childId: product.id,
        defaultQuantity: 1,
        minQuantity: 0,
        position: items.length,
      });
      onItemsChange([...items, response]);
      setShowProductSearch(false);
      setSearchQuery('');
    } catch (error) {
      console.error('Error adding item:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Update item
  const handleUpdateItem = async (
    itemId: string,
    updates: { defaultQuantity?: number; minQuantity?: number; maxQuantity?: number | null }
  ) => {
    setIsSaving(true);
    try {
      const response = await api.updateGroupedItem(itemId, {
        ...updates,
        maxQuantity: updates.maxQuantity ?? undefined,
      });
      onItemsChange(items.map((item) => (item.id === itemId ? response : item)));
      setEditingItem(null);
    } catch (error) {
      console.error('Error updating item:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Remove item
  const handleRemoveItem = async (itemId: string) => {
    setIsSaving(true);
    try {
      await api.removeGroupedItem(itemId);
      onItemsChange(items.filter((item) => item.id !== itemId));
    } catch (error) {
      console.error('Error removing item:', error);
    } finally {
      setIsSaving(false);
    }
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
            Produtos Agrupados
          </h3>
          <p className="text-sm text-dark-500">
            {items.length} produto{items.length !== 1 ? 's' : ''} no grupo
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

      {/* Info Card */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-800 dark:text-blue-200">
              Produto Agrupado
            </h4>
            <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
              Cada produto é adicionado ao carrinho individualmente. Configure quantidades mínimas e máximas para cada item.
            </p>
          </div>
        </div>
      </div>

      {/* Product Search Modal */}
      {showProductSearch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            {/* Search Header */}
            <div className="p-4 border-b border-dark-200 dark:border-dark-700">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-dark-900 dark:text-white">
                  Adicionar Produto ao Grupo
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
                      onClick={() => handleAddItem(product)}
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

      {/* Items List */}
      {items.length === 0 ? (
        <div className="p-8 text-center border-2 border-dashed border-dark-200 dark:border-dark-700 rounded-lg">
          <Users className="w-12 h-12 mx-auto mb-3 text-dark-300" />
          <p className="text-dark-500">Nenhum produto adicionado ao grupo</p>
          <button
            onClick={() => setShowProductSearch(true)}
            className="mt-3 text-primary-600 hover:text-primary-700 font-medium"
          >
            Adicionar primeiro produto
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg"
            >
              {/* Main Row */}
              <div className="flex items-center gap-3 p-3">
                {/* Drag Handle */}
                <GripVertical className="w-5 h-5 text-dark-300 cursor-grab flex-shrink-0" />

                {/* Position */}
                <span className="w-6 h-6 rounded bg-dark-100 dark:bg-dark-700 flex items-center justify-center text-xs font-medium text-dark-500">
                  {index + 1}
                </span>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-dark-900 dark:text-white truncate">
                    {item.childName}
                  </p>
                  <p className="text-sm text-dark-500">{item.childSku}</p>
                </div>

                {/* Price */}
                <div className="flex items-center gap-1 text-sm">
                  <DollarSign className="w-4 h-4 text-dark-400" />
                  <span className="text-dark-600 dark:text-dark-400">
                    R$ {(item.childPrice ?? 0).toFixed(2)}
                  </span>
                </div>

                {/* Stock */}
                <div className={cn(
                  'px-2 py-1 rounded text-xs font-medium',
                  item.childStock > 10
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : item.childStock > 0
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                )}>
                  {item.childStock} un
                </div>

                {/* Settings Toggle */}
                <button
                  onClick={() => setEditingItem(editingItem === item.id ? null : item.id)}
                  className={cn(
                    'p-1.5 rounded transition-colors',
                    editingItem === item.id
                      ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                      : 'text-dark-400 hover:bg-dark-100 dark:hover:bg-dark-700'
                  )}
                >
                  <Settings className="w-4 h-4" />
                </button>

                {/* Remove Button */}
                <button
                  onClick={() => handleRemoveItem(item.id)}
                  disabled={isSaving}
                  className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Expanded Settings */}
              {editingItem === item.id && (
                <div className="px-3 pb-3 pt-0">
                  <div className="p-3 bg-dark-50 dark:bg-dark-900 rounded-lg">
                    <div className="grid grid-cols-3 gap-3">
                      {/* Default Quantity */}
                      <div>
                        <label className="block text-xs font-medium text-dark-500 mb-1">
                          Qtd. Padrão
                        </label>
                        <input
                          type="number"
                          min="1"
                          defaultValue={item.defaultQuantity}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            if (val !== item.defaultQuantity) {
                              handleUpdateItem(item.id, { defaultQuantity: val });
                            }
                          }}
                          className="w-full px-2 py-1.5 text-sm border border-dark-300 dark:border-dark-600 rounded bg-white dark:bg-dark-800"
                        />
                      </div>

                      {/* Min Quantity */}
                      <div>
                        <label className="block text-xs font-medium text-dark-500 mb-1">
                          Qtd. Mínima
                        </label>
                        <input
                          type="number"
                          min="0"
                          defaultValue={item.minQuantity}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            if (val !== item.minQuantity) {
                              handleUpdateItem(item.id, { minQuantity: val });
                            }
                          }}
                          className="w-full px-2 py-1.5 text-sm border border-dark-300 dark:border-dark-600 rounded bg-white dark:bg-dark-800"
                        />
                      </div>

                      {/* Max Quantity */}
                      <div>
                        <label className="block text-xs font-medium text-dark-500 mb-1">
                          Qtd. Máxima
                        </label>
                        <input
                          type="number"
                          min="1"
                          defaultValue={item.maxQuantity ?? ''}
                          placeholder="Ilimitado"
                          onBlur={(e) => {
                            const val = e.target.value ? parseInt(e.target.value) : null;
                            if (val !== item.maxQuantity) {
                              handleUpdateItem(item.id, { maxQuantity: val });
                            }
                          }}
                          className="w-full px-2 py-1.5 text-sm border border-dark-300 dark:border-dark-600 rounded bg-white dark:bg-dark-800"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
