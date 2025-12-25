'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Package, FolderTree, Tag, Clock, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import { api } from '@/lib/api';
import Image from 'next/image';

interface SearchSuggestion {
  type: 'product' | 'category' | 'brand';
  text: string;
  subtext: string | null;
  id: string;
  imageUrl?: string | null;
}

interface SearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (value: string) => void;
  onSelectSuggestion?: (suggestion: SearchSuggestion) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const RECENT_SEARCHES_KEY = 'pim_recent_searches';
const MAX_RECENT_SEARCHES = 5;

export function SearchAutocomplete({
  value,
  onChange,
  onSearch,
  onSelectSuggestion,
  placeholder = 'Buscar por nome, SKU, descrição...',
  className,
  disabled = false,
}: SearchAutocompleteProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const debouncedValue = useDebounce(value, 300);

  // Load recent searches from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        try {
          setRecentSearches(JSON.parse(stored));
        } catch {}
      }
    }
  }, []);

  // Fetch suggestions when debounced value changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (debouncedValue.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const data = await api.getSearchSuggestions(debouncedValue);
        setSuggestions(data);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedValue]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Save to recent searches
  const saveToRecentSearches = useCallback((searchTerm: string) => {
    if (!searchTerm.trim()) return;

    const updated = [
      searchTerm,
      ...recentSearches.filter((s) => s.toLowerCase() !== searchTerm.toLowerCase()),
    ].slice(0, MAX_RECENT_SEARCHES);

    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  }, [recentSearches]);

  // Handle search submission
  const handleSearch = () => {
    if (value.trim()) {
      saveToRecentSearches(value.trim());
    }
    onSearch(value);
    setShowDropdown(false);
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'product') {
      onChange(suggestion.text);
      saveToRecentSearches(suggestion.text);
    }

    if (onSelectSuggestion) {
      onSelectSuggestion(suggestion);
    } else if (suggestion.type === 'product') {
      onSearch(suggestion.text);
    }

    setShowDropdown(false);
  };

  // Handle recent search click
  const handleRecentSearchClick = (search: string) => {
    onChange(search);
    onSearch(search);
    setShowDropdown(false);
  };

  // Remove from recent searches
  const removeFromRecentSearches = (search: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter((s) => s !== search);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  // Get icon for suggestion type
  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'product':
        return <Package className="w-4 h-4 text-primary-500" />;
      case 'category':
        return <FolderTree className="w-4 h-4 text-purple-500" />;
      case 'brand':
        return <Tag className="w-4 h-4 text-orange-500" />;
      default:
        return <Search className="w-4 h-4 text-dark-400" />;
    }
  };

  const shouldShowDropdown = showDropdown && isFocused && (
    suggestions.length > 0 ||
    (value.length === 0 && recentSearches.length > 0) ||
    isLoading
  );

  return (
    <div className={cn('relative flex-1', className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            setShowDropdown(true);
          }}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearch();
            }
            if (e.key === 'Escape') {
              setShowDropdown(false);
              inputRef.current?.blur();
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'w-full pl-10 pr-10 py-2.5 border rounded-lg text-sm transition-colors',
            'border-dark-300 dark:border-dark-600',
            'bg-white dark:bg-dark-800',
            'placeholder:text-dark-400',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400 animate-spin" />
        )}
        {!isLoading && value && (
          <button
            onClick={() => {
              onChange('');
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-dark-100 dark:hover:bg-dark-700 rounded"
          >
            <X className="w-4 h-4 text-dark-400" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {shouldShowDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-dark-800 rounded-lg shadow-lg border border-dark-200 dark:border-dark-700 z-50 overflow-hidden max-h-96 overflow-y-auto"
        >
          {/* Loading State */}
          {isLoading && (
            <div className="p-4 text-center text-dark-500">
              <Loader2 className="w-5 h-5 mx-auto mb-2 animate-spin" />
              <p className="text-sm">Buscando...</p>
            </div>
          )}

          {/* Recent Searches */}
          {!isLoading && value.length === 0 && recentSearches.length > 0 && (
            <div className="p-2">
              <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-dark-500 uppercase">
                <Clock className="w-3.5 h-3.5" />
                Buscas Recentes
              </div>
              {recentSearches.map((search) => (
                <button
                  key={search}
                  onClick={() => handleRecentSearchClick(search)}
                  className="w-full flex items-center justify-between px-2 py-2 text-sm text-left rounded hover:bg-dark-50 dark:hover:bg-dark-700 group"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-dark-400" />
                    <span className="text-dark-700 dark:text-dark-300">{search}</span>
                  </div>
                  <button
                    onClick={(e) => removeFromRecentSearches(search, e)}
                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-dark-200 dark:hover:bg-dark-600 rounded transition-opacity"
                  >
                    <X className="w-3.5 h-3.5 text-dark-400" />
                  </button>
                </button>
              ))}
            </div>
          )}

          {/* Suggestions */}
          {!isLoading && suggestions.length > 0 && (
            <div className="p-2">
              {/* Group by type */}
              {['product', 'category', 'brand'].map((type) => {
                const typeSuggestions = suggestions.filter((s) => s.type === type);
                if (typeSuggestions.length === 0) return null;

                const typeLabel = {
                  product: 'Produtos',
                  category: 'Categorias',
                  brand: 'Marcas',
                }[type];

                return (
                  <div key={type}>
                    <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-dark-500 uppercase">
                      {getSuggestionIcon(type)}
                      {typeLabel}
                    </div>
                    {typeSuggestions.map((suggestion) => (
                      <button
                        key={`${suggestion.type}-${suggestion.id}`}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full flex items-center gap-3 px-2 py-2 text-left rounded hover:bg-dark-50 dark:hover:bg-dark-700"
                      >
                        {suggestion.imageUrl ? (
                          <div className="w-10 h-10 rounded bg-dark-100 dark:bg-dark-700 overflow-hidden flex-shrink-0">
                            <Image
                              src={suggestion.imageUrl}
                              alt={suggestion.text}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded bg-dark-100 dark:bg-dark-700 flex items-center justify-center flex-shrink-0">
                            {getSuggestionIcon(suggestion.type)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-dark-900 dark:text-white truncate">
                            {suggestion.text}
                          </p>
                          {suggestion.subtext && (
                            <p className="text-xs text-dark-500 truncate">
                              {suggestion.subtext}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* No Results */}
          {!isLoading && value.length >= 2 && suggestions.length === 0 && (
            <div className="p-4 text-center text-dark-500">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum resultado encontrado</p>
              <p className="text-xs mt-1">Pressione Enter para buscar mesmo assim</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
