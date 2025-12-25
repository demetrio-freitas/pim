'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  Save,
  Trash2,
  Star,
  ChevronDown,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
interface SavedFilter<T = Record<string, any>> {
  id: string;
  name: string;
  filters: T;
  createdAt: string;
  isFavorite: boolean;
}

interface SavedFiltersDropdownProps<T extends Record<string, any>> {
  storageKey: string;
  currentFilters: T;
  onLoadFilter: (filters: T) => void;
  className?: string;
  buttonClassName?: string;
}

// Helper functions
const generateId = () => Math.random().toString(36).substring(2, 9);

export function SavedFiltersDropdown<T extends Record<string, any>>({
  storageKey,
  currentFilters,
  onLoadFilter,
  className,
  buttonClassName,
}: SavedFiltersDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [savedFilters, setSavedFilters] = useState<SavedFilter<T>[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load saved filters
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        setSavedFilters(JSON.parse(stored));
      } catch {}
    }
  }, [storageKey]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Save filters to storage
  const saveFilters = (filters: SavedFilter<T>[]) => {
    localStorage.setItem(storageKey, JSON.stringify(filters));
    setSavedFilters(filters);
  };

  // Handle save new filter
  const handleSave = () => {
    if (!filterName.trim()) return;

    const newFilter: SavedFilter<T> = {
      id: generateId(),
      name: filterName.trim(),
      filters: { ...currentFilters },
      createdAt: new Date().toISOString(),
      isFavorite: false,
    };

    saveFilters([...savedFilters, newFilter]);
    setFilterName('');
    setShowSaveModal(false);
  };

  // Handle load filter
  const handleLoad = (filter: SavedFilter<T>) => {
    onLoadFilter(filter.filters);
    setIsOpen(false);
  };

  // Handle delete filter
  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    saveFilters(savedFilters.filter(f => f.id !== id));
  };

  // Handle toggle favorite
  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    saveFilters(savedFilters.map(f =>
      f.id === id ? { ...f, isFavorite: !f.isFavorite } : f
    ));
  };

  // Count active filters
  const hasActiveFilters = Object.values(currentFilters).some(v => v !== '' && v !== 'all' && v !== undefined);

  // Sort filters (favorites first)
  const sortedFilters = [...savedFilters].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {/* Dropdown Trigger */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors',
            'border-dark-300 dark:border-dark-600 hover:bg-dark-50 dark:hover:bg-dark-800',
            savedFilters.length > 0 && 'border-primary-300 dark:border-primary-700',
            buttonClassName
          )}
        >
          {savedFilters.length > 0 ? (
            <BookmarkCheck className="w-4 h-4 text-primary-500" />
          ) : (
            <Bookmark className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">
            Filtros Salvos
          </span>
          {savedFilters.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full">
              {savedFilters.length}
            </span>
          )}
          <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
        </button>

        {hasActiveFilters && (
          <button
            onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-lg border border-primary-200 dark:border-primary-800"
            title="Salvar filtro atual"
          >
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">Salvar</span>
          </button>
        )}
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-dark-800 rounded-lg shadow-lg border border-dark-200 dark:border-dark-700 z-50 overflow-hidden">
          {/* Header */}
          <div className="p-3 border-b border-dark-200 dark:border-dark-700">
            <h4 className="font-medium text-dark-900 dark:text-white flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-primary-500" />
              Filtros Salvos
            </h4>
            <p className="text-xs text-dark-500 mt-0.5">
              Selecione para aplicar
            </p>
          </div>

          {/* Filters List */}
          <div className="max-h-64 overflow-y-auto">
            {sortedFilters.length === 0 ? (
              <div className="p-4 text-center text-dark-500">
                <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum filtro salvo</p>
                <p className="text-xs mt-1">Configure filtros e clique em Salvar</p>
              </div>
            ) : (
              <div className="p-1">
                {sortedFilters.map((filter) => (
                  <div
                    key={filter.id}
                    onClick={() => handleLoad(filter)}
                    className="flex items-center justify-between p-2 hover:bg-dark-50 dark:hover:bg-dark-700 rounded cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {filter.isFavorite && (
                        <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-dark-900 dark:text-white truncate">
                          {filter.name}
                        </p>
                        <p className="text-xs text-dark-500">
                          {new Date(filter.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleToggleFavorite(filter.id, e)}
                        className="p-1 hover:bg-dark-200 dark:hover:bg-dark-600 rounded"
                        title={filter.isFavorite ? 'Remover favorito' : 'Favoritar'}
                      >
                        {filter.isFavorite ? (
                          <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                        ) : (
                          <Star className="w-3.5 h-3.5 text-dark-400" />
                        )}
                      </button>
                      <button
                        onClick={(e) => handleDelete(filter.id, e)}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl w-full max-w-sm">
            <div className="p-4 border-b border-dark-200 dark:border-dark-700 flex items-center justify-between">
              <h3 className="font-semibold text-dark-900 dark:text-white flex items-center gap-2">
                <Save className="w-4 h-4 text-primary-500" />
                Salvar Filtro
              </h3>
              <button
                onClick={() => { setShowSaveModal(false); setFilterName(''); }}
                className="p-1 hover:bg-dark-100 dark:hover:bg-dark-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
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
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
            </div>
            <div className="p-4 border-t border-dark-200 dark:border-dark-700 flex justify-end gap-2">
              <button
                onClick={() => { setShowSaveModal(false); setFilterName(''); }}
                className="px-3 py-1.5 text-sm text-dark-700 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!filterName.trim()}
                className="px-3 py-1.5 text-sm bg-primary-500 hover:bg-primary-600 text-white rounded-lg disabled:opacity-50"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
