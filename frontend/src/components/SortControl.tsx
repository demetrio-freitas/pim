'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SortOption = {
  value: string;
  label: string;
  field: string;
  direction: 'asc' | 'desc';
  icon?: string;
};

const defaultSortOptions: SortOption[] = [
  { value: 'name-asc', label: 'Nome (A → Z)', field: 'name', direction: 'asc', icon: '📝' },
  { value: 'name-desc', label: 'Nome (Z → A)', field: 'name', direction: 'desc', icon: '📝' },
  { value: 'createdAt-desc', label: 'Mais recentes', field: 'createdAt', direction: 'desc', icon: '📅' },
  { value: 'createdAt-asc', label: 'Mais antigos', field: 'createdAt', direction: 'asc', icon: '📅' },
  { value: 'price-asc', label: 'Menor preço', field: 'price', direction: 'asc', icon: '💰' },
  { value: 'price-desc', label: 'Maior preço', field: 'price', direction: 'desc', icon: '💰' },
  { value: 'sku-asc', label: 'SKU (A → Z)', field: 'sku', direction: 'asc', icon: '🏷️' },
  { value: 'sku-desc', label: 'SKU (Z → A)', field: 'sku', direction: 'desc', icon: '🏷️' },
  { value: 'stockQuantity-asc', label: 'Menor estoque', field: 'stockQuantity', direction: 'asc', icon: '📦' },
  { value: 'stockQuantity-desc', label: 'Maior estoque', field: 'stockQuantity', direction: 'desc', icon: '📦' },
  { value: 'completenessScore-asc', label: 'Menor completude', field: 'completenessScore', direction: 'asc', icon: '📊' },
  { value: 'completenessScore-desc', label: 'Maior completude', field: 'completenessScore', direction: 'desc', icon: '📊' },
];

interface SortControlProps {
  value: string;
  onChange: (value: string) => void;
  options?: SortOption[];
  storageKey?: string;
  className?: string;
  disabled?: boolean;
}

export function SortControl({
  value,
  onChange,
  options = defaultSortOptions,
  storageKey = 'productSortBy',
  className,
  disabled = false,
}: SortControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && storageKey) {
      const stored = localStorage.getItem(storageKey);
      if (stored && options.some(opt => opt.value === stored)) {
        onChange(stored);
      }
    }
  }, []);

  // Save to localStorage when value changes
  useEffect(() => {
    if (typeof window !== 'undefined' && storageKey && value) {
      localStorage.setItem(storageKey, value);
    }
  }, [value, storageKey]);

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

  const selectedOption = options.find(opt => opt.value === value);
  const isAscending = selectedOption?.direction === 'asc';

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  // Group options by field for better organization
  const groupedOptions = options.reduce((acc, option) => {
    const group = option.icon || 'Outros';
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(option);
    return acc;
  }, {} as Record<string, SortOption[]>);

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors min-w-[180px] justify-between',
          'bg-white dark:bg-dark-800 border-dark-200 dark:border-dark-700',
          'hover:border-primary-500 hover:bg-dark-50 dark:hover:bg-dark-700',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
          disabled && 'opacity-50 cursor-not-allowed',
          isOpen && 'border-primary-500 ring-2 ring-primary-500 ring-offset-1'
        )}
      >
        <div className="flex items-center gap-2">
          {isAscending ? (
            <ArrowUp className="w-4 h-4 text-dark-500" />
          ) : (
            <ArrowDown className="w-4 h-4 text-dark-500" />
          )}
          <span className="text-dark-700 dark:text-dark-300 truncate">
            {selectedOption?.icon} {selectedOption?.label || 'Ordenar por...'}
          </span>
        </div>
        <ArrowUpDown className="w-4 h-4 text-dark-400 flex-shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-dark-800 rounded-lg shadow-lg border border-dark-200 dark:border-dark-700 z-50 py-1 max-h-80 overflow-y-auto">
          {Object.entries(groupedOptions).map(([group, groupOptions], groupIndex) => (
            <div key={group}>
              {groupIndex > 0 && (
                <div className="border-t border-dark-100 dark:border-dark-700 my-1" />
              )}
              {groupOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors',
                    value === option.value
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                      : 'text-dark-700 dark:text-dark-300 hover:bg-dark-50 dark:hover:bg-dark-700'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span>{option.icon}</span>
                    <span>{option.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {option.direction === 'asc' ? (
                      <ArrowUp className="w-3 h-3 text-dark-400" />
                    ) : (
                      <ArrowDown className="w-3 h-3 text-dark-400" />
                    )}
                    {value === option.value && (
                      <Check className="w-4 h-4 text-primary-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper function to parse sort value
export function parseSortValue(value: string): { field: string; direction: 'asc' | 'desc' } {
  const option = defaultSortOptions.find(opt => opt.value === value);
  if (option) {
    return { field: option.field, direction: option.direction };
  }
  // Fallback for custom format like 'name-asc'
  const [field, direction] = value.split('-');
  return { field, direction: (direction as 'asc' | 'desc') || 'asc' };
}

export { defaultSortOptions };
