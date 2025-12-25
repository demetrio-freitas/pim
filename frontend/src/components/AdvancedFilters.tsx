'use client';

import { useState, useEffect } from 'react';
import {
  Filter,
  Save,
  Trash2,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Bookmark,
  BookmarkCheck,
  Star,
  History,
  Settings2,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProductStatus } from '@/types';

// Types
interface SavedFilter {
  id: string;
  name: string;
  filters: FilterState;
  createdAt: string;
  isFavorite: boolean;
}

interface FilterState {
  search: string;
  status: ProductStatus | '';
  categoryId: string;
  productType: string;
  priceMin: string;
  priceMax: string;
  stockMin: string;
  stockMax: string;
  brand: string;
  hasImages: 'all' | 'with' | 'without';
  completeness: 'all' | 'incomplete' | 'complete';
  dateFrom: string;
  dateTo: string;
}

interface AdvancedFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  categories?: { id: string; name: string }[];
  onApply?: () => void;
  className?: string;
}

// Storage key
const STORAGE_KEY = 'pim_saved_filters';

// Default filter state
const defaultFilters: FilterState = {
  search: '',
  status: '',
  categoryId: '',
  productType: '',
  priceMin: '',
  priceMax: '',
  stockMin: '',
  stockMax: '',
  brand: '',
  hasImages: 'all',
  completeness: 'all',
  dateFrom: '',
  dateTo: '',
};

// Status options
const statusOptions = [
  { value: '', label: 'Todos' },
  { value: 'DRAFT', label: 'Rascunho' },
  { value: 'PENDING_REVIEW', label: 'Aguardando Revisao' },
  { value: 'APPROVED', label: 'Aprovado' },
  { value: 'PUBLISHED', label: 'Publicado' },
  { value: 'ARCHIVED', label: 'Arquivado' },
];

// Product type options
const productTypeOptions = [
  { value: '', label: 'Todos os Tipos' },
  { value: 'SIMPLE', label: 'Simples' },
  { value: 'CONFIGURABLE', label: 'Variante' },
  { value: 'BUNDLE', label: 'Bundle' },
  { value: 'VIRTUAL', label: 'Virtual' },
  { value: 'GROUPED', label: 'Agrupado' },
];

// Helper functions
const getSavedFilters = (): SavedFilter[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
};

const saveSavedFilters = (filters: SavedFilter[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
};

const generateId = () => Math.random().toString(36).substring(2, 9);

export function AdvancedFilters({
  filters,
  onChange,
  categories = [],
  onApply,
  className,
}: AdvancedFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load saved filters on mount
  useEffect(() => {
    setSavedFilters(getSavedFilters());

    // Load recent searches
    const storedSearches = localStorage.getItem('pim_recent_searches');
    if (storedSearches) {
      try {
        setRecentSearches(JSON.parse(storedSearches));
      } catch {}
    }
  }, []);

  // Count active filters
  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'hasImages' || key === 'completeness') return value !== 'all';
    return value !== '' && value !== undefined;
  }).length;

  // Handle filter change
  const handleChange = (key: keyof FilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  // Save current filters
  const handleSaveFilter = () => {
    if (!filterName.trim()) return;

    const newFilter: SavedFilter = {
      id: generateId(),
      name: filterName.trim(),
      filters: { ...filters },
      createdAt: new Date().toISOString(),
      isFavorite: false,
    };

    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    saveSavedFilters(updated);
    setFilterName('');
    setShowSaveModal(false);
  };

  // Load saved filter
  const handleLoadFilter = (savedFilter: SavedFilter) => {
    onChange(savedFilter.filters);
    setShowSavedModal(false);
  };

  // Delete saved filter
  const handleDeleteFilter = (id: string) => {
    const updated = savedFilters.filter(f => f.id !== id);
    setSavedFilters(updated);
    saveSavedFilters(updated);
  };

  // Toggle favorite
  const handleToggleFavorite = (id: string) => {
    const updated = savedFilters.map(f =>
      f.id === id ? { ...f, isFavorite: !f.isFavorite } : f
    );
    setSavedFilters(updated);
    saveSavedFilters(updated);
  };

  // Reset all filters
  const handleReset = () => {
    onChange(defaultFilters);
  };

  // Add to recent searches
  const addToRecentSearches = (search: string) => {
    if (!search.trim()) return;
    const updated = [search, ...recentSearches.filter(s => s !== search)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('pim_recent_searches', JSON.stringify(updated));
  };

  // Apply recent search
  const handleRecentSearch = (search: string) => {
    handleChange('search', search);
    onApply?.();
  };

  // Sort saved filters (favorites first)
  const sortedSavedFilters = [...savedFilters].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with quick actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium text-dark-700 dark:text-dark-300 hover:text-primary-600 dark:hover:text-primary-400"
        >
          <Filter className="w-4 h-4" />
          Filtros Avancados
          {activeFiltersCount > 0 && (
            <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs rounded-full">
              {activeFiltersCount}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        <div className="flex items-center gap-2">
          {/* Saved Filters Button */}
          <button
            onClick={() => setShowSavedModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-dark-600 dark:text-dark-400 hover:bg-dark-100 dark:hover:bg-dark-800 rounded-lg"
          >
            <Bookmark className="w-4 h-4" />
            Salvos ({savedFilters.length})
          </button>

          {/* Save Current Filter */}
          {activeFiltersCount > 0 && (
            <button
              onClick={() => setShowSaveModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-lg"
            >
              <Save className="w-4 h-4" />
              Salvar Filtro
            </button>
          )}

          {/* Reset Filters */}
          {activeFiltersCount > 0 && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
            >
              <RotateCcw className="w-4 h-4" />
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Recent Searches */}
      {recentSearches.length > 0 && !isExpanded && (
        <div className="flex items-center gap-2 flex-wrap">
          <History className="w-4 h-4 text-dark-400" />
          <span className="text-xs text-dark-500">Recentes:</span>
          {recentSearches.map((search, idx) => (
            <button
              key={idx}
              onClick={() => handleRecentSearch(search)}
              className="px-2 py-1 text-xs bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-400 rounded hover:bg-dark-200 dark:hover:bg-dark-700"
            >
              {search}
            </button>
          ))}
        </div>
      )}

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="p-4 bg-dark-50 dark:bg-dark-800/50 rounded-lg space-y-4">
          {/* Row 1: Basic filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-dark-600 dark:text-dark-400 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="input w-full text-sm"
              >
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-dark-600 dark:text-dark-400 mb-1">
                Tipo de Produto
              </label>
              <select
                value={filters.productType}
                onChange={(e) => handleChange('productType', e.target.value)}
                className="input w-full text-sm"
              >
                {productTypeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-dark-600 dark:text-dark-400 mb-1">
                Categoria
              </label>
              <select
                value={filters.categoryId}
                onChange={(e) => handleChange('categoryId', e.target.value)}
                className="input w-full text-sm"
              >
                <option value="">Todas as categorias</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-dark-600 dark:text-dark-400 mb-1">
                Marca
              </label>
              <input
                type="text"
                value={filters.brand}
                onChange={(e) => handleChange('brand', e.target.value)}
                placeholder="Filtrar por marca..."
                className="input w-full text-sm"
              />
            </div>
          </div>

          {/* Row 2: Price and Stock range */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-dark-600 dark:text-dark-400 mb-1">
                Preco Minimo
              </label>
              <input
                type="number"
                value={filters.priceMin}
                onChange={(e) => handleChange('priceMin', e.target.value)}
                placeholder="0.00"
                className="input w-full text-sm"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-dark-600 dark:text-dark-400 mb-1">
                Preco Maximo
              </label>
              <input
                type="number"
                value={filters.priceMax}
                onChange={(e) => handleChange('priceMax', e.target.value)}
                placeholder="9999.99"
                className="input w-full text-sm"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-dark-600 dark:text-dark-400 mb-1">
                Estoque Minimo
              </label>
              <input
                type="number"
                value={filters.stockMin}
                onChange={(e) => handleChange('stockMin', e.target.value)}
                placeholder="0"
                className="input w-full text-sm"
                min="0"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-dark-600 dark:text-dark-400 mb-1">
                Estoque Maximo
              </label>
              <input
                type="number"
                value={filters.stockMax}
                onChange={(e) => handleChange('stockMax', e.target.value)}
                placeholder="9999"
                className="input w-full text-sm"
                min="0"
              />
            </div>
          </div>

          {/* Row 3: Additional filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-dark-600 dark:text-dark-400 mb-1">
                Imagens
              </label>
              <select
                value={filters.hasImages}
                onChange={(e) => handleChange('hasImages', e.target.value)}
                className="input w-full text-sm"
              >
                <option value="all">Todos</option>
                <option value="with">Com imagens</option>
                <option value="without">Sem imagens</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-dark-600 dark:text-dark-400 mb-1">
                Completude
              </label>
              <select
                value={filters.completeness}
                onChange={(e) => handleChange('completeness', e.target.value)}
                className="input w-full text-sm"
              >
                <option value="all">Todos</option>
                <option value="complete">Completos (80%+)</option>
                <option value="incomplete">Incompletos</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-dark-600 dark:text-dark-400 mb-1">
                Criado a partir de
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleChange('dateFrom', e.target.value)}
                className="input w-full text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-dark-600 dark:text-dark-400 mb-1">
                Criado ate
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleChange('dateTo', e.target.value)}
                className="input w-full text-sm"
              />
            </div>
          </div>

          {/* Active Filters Tags */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-dark-200 dark:border-dark-700">
              <span className="text-xs text-dark-500">Filtros ativos:</span>
              {filters.status && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded text-xs">
                  Status: {statusOptions.find(s => s.value === filters.status)?.label}
                  <button onClick={() => handleChange('status', '')} className="hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.productType && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded text-xs">
                  Tipo: {productTypeOptions.find(t => t.value === filters.productType)?.label}
                  <button onClick={() => handleChange('productType', '')} className="hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.categoryId && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded text-xs">
                  Categoria: {categories.find(c => c.id === filters.categoryId)?.name}
                  <button onClick={() => handleChange('categoryId', '')} className="hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.brand && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded text-xs">
                  Marca: {filters.brand}
                  <button onClick={() => handleChange('brand', '')} className="hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {(filters.priceMin || filters.priceMax) && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded text-xs">
                  Preco: R$ {filters.priceMin || '0'} - R$ {filters.priceMax || '...'}
                  <button onClick={() => { handleChange('priceMin', ''); handleChange('priceMax', ''); }} className="hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {(filters.stockMin || filters.stockMax) && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded text-xs">
                  Estoque: {filters.stockMin || '0'} - {filters.stockMax || '...'}
                  <button onClick={() => { handleChange('stockMin', ''); handleChange('stockMax', ''); }} className="hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.hasImages !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded text-xs">
                  {filters.hasImages === 'with' ? 'Com imagens' : 'Sem imagens'}
                  <button onClick={() => handleChange('hasImages', 'all')} className="hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.completeness !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded text-xs">
                  {filters.completeness === 'complete' ? 'Completos' : 'Incompletos'}
                  <button onClick={() => handleChange('completeness', 'all')} className="hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {(filters.dateFrom || filters.dateTo) && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded text-xs">
                  Data: {filters.dateFrom || '...'} - {filters.dateTo || '...'}
                  <button onClick={() => { handleChange('dateFrom', ''); handleChange('dateTo', ''); }} className="hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Save Filter Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-dark-200 dark:border-dark-700">
              <h3 className="text-lg font-semibold text-dark-900 dark:text-white flex items-center gap-2">
                <Save className="w-5 h-5 text-primary-500" />
                Salvar Filtro
              </h3>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                Nome do filtro
              </label>
              <input
                type="text"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="Ex: Produtos em promocao"
                className="input w-full"
                autoFocus
              />
              <p className="text-xs text-dark-500 mt-2">
                Este filtro salvara {activeFiltersCount} criterio(s) de busca.
              </p>
            </div>
            <div className="p-6 border-t border-dark-200 dark:border-dark-700 flex justify-end gap-3">
              <button
                onClick={() => { setShowSaveModal(false); setFilterName(''); }}
                className="px-4 py-2 text-dark-700 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveFilter}
                disabled={!filterName.trim()}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg disabled:opacity-50"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Filters Modal */}
      {showSavedModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-dark-200 dark:border-dark-700">
              <h3 className="text-lg font-semibold text-dark-900 dark:text-white flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-primary-500" />
                Filtros Salvos
              </h3>
              <p className="text-sm text-dark-500 mt-1">
                Selecione um filtro para aplicar
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {sortedSavedFilters.length === 0 ? (
                <div className="text-center py-8 text-dark-500">
                  <Bookmark className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhum filtro salvo ainda</p>
                  <p className="text-sm mt-1">Configure filtros e salve para acesso rapido</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedSavedFilters.map((savedFilter) => (
                    <div
                      key={savedFilter.id}
                      className="flex items-center justify-between p-3 bg-dark-50 dark:bg-dark-700 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-600 transition-colors"
                    >
                      <button
                        onClick={() => handleLoadFilter(savedFilter)}
                        className="flex-1 text-left"
                      >
                        <div className="flex items-center gap-2">
                          {savedFilter.isFavorite && (
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          )}
                          <span className="font-medium text-dark-900 dark:text-white">
                            {savedFilter.name}
                          </span>
                        </div>
                        <p className="text-xs text-dark-500 mt-1">
                          Criado em {new Date(savedFilter.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleFavorite(savedFilter.id)}
                          className="p-2 hover:bg-dark-200 dark:hover:bg-dark-600 rounded"
                          title={savedFilter.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                        >
                          {savedFilter.isFavorite ? (
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          ) : (
                            <Star className="w-4 h-4 text-dark-400" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteFilter(savedFilter.id)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                          title="Excluir filtro"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-dark-200 dark:border-dark-700">
              <button
                onClick={() => setShowSavedModal(false)}
                className="w-full px-4 py-2 text-dark-700 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Export types for use in other components
export type { FilterState, SavedFilter };
export { defaultFilters };
