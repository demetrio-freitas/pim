'use client';

import { useState } from 'react';
import {
  Package,
  Settings2,
  Cloud,
  PackageOpen,
  Users,
  Check,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProductType, PRODUCT_TYPE_LABELS, PRODUCT_TYPE_DESCRIPTIONS } from '@/types';

interface ProductTypeSelectorProps {
  value: ProductType;
  onChange: (type: ProductType) => void;
  disabled?: boolean;
  allowedTypes?: ProductType[];
  showDescriptions?: boolean;
  layout?: 'grid' | 'list';
}

const TYPE_ICONS: Record<ProductType, React.ComponentType<{ className?: string }>> = {
  SIMPLE: Package,
  CONFIGURABLE: Settings2,
  VIRTUAL: Cloud,
  BUNDLE: PackageOpen,
  GROUPED: Users,
};

const TYPE_COLORS: Record<ProductType, string> = {
  SIMPLE: 'bg-blue-500',
  CONFIGURABLE: 'bg-purple-500',
  VIRTUAL: 'bg-cyan-500',
  BUNDLE: 'bg-orange-500',
  GROUPED: 'bg-green-500',
};

export function ProductTypeSelector({
  value,
  onChange,
  disabled = false,
  allowedTypes,
  showDescriptions = true,
  layout = 'grid',
}: ProductTypeSelectorProps) {
  const types: ProductType[] = allowedTypes || ['SIMPLE', 'CONFIGURABLE', 'BUNDLE', 'GROUPED', 'VIRTUAL'];

  return (
    <div className={cn(
      layout === 'grid'
        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'
        : 'flex flex-col gap-2'
    )}>
      {types.map((type) => {
        const Icon = TYPE_ICONS[type];
        const isSelected = value === type;
        const isDisabled = disabled;

        return (
          <button
            key={type}
            type="button"
            onClick={() => !isDisabled && onChange(type)}
            disabled={isDisabled}
            className={cn(
              'relative flex items-start gap-3 p-4 rounded-lg border-2 transition-all text-left',
              isSelected
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-dark-200 dark:border-dark-700 hover:border-dark-300 dark:hover:border-dark-600',
              isDisabled && 'opacity-50 cursor-not-allowed',
              !isDisabled && !isSelected && 'hover:bg-dark-50 dark:hover:bg-dark-800'
            )}
          >
            {/* Icon */}
            <div className={cn(
              'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
              isSelected ? TYPE_COLORS[type] : 'bg-dark-100 dark:bg-dark-700'
            )}>
              <Icon className={cn(
                'w-5 h-5',
                isSelected ? 'text-white' : 'text-dark-500'
              )} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn(
                  'font-medium',
                  isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-dark-900 dark:text-white'
                )}>
                  {PRODUCT_TYPE_LABELS[type]}
                </span>
                {isSelected && (
                  <Check className="w-4 h-4 text-primary-500" />
                )}
              </div>
              {showDescriptions && (
                <p className="mt-1 text-sm text-dark-500 dark:text-dark-400">
                  {PRODUCT_TYPE_DESCRIPTIONS[type]}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

interface ProductTypeConversionProps {
  currentType: ProductType;
  canConvertTo: ProductType[];
  onConvert: (targetType: ProductType) => void;
  isLoading?: boolean;
}

export function ProductTypeConversion({
  currentType,
  canConvertTo,
  onConvert,
  isLoading = false,
}: ProductTypeConversionProps) {
  const [selectedType, setSelectedType] = useState<ProductType | null>(null);

  if (canConvertTo.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-800 dark:text-amber-200">
              Conversão não disponível
            </h4>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
              {currentType === 'CONFIGURABLE'
                ? 'Remova todas as variantes antes de converter este produto.'
                : 'Este produto não pode ser convertido para outro tipo no momento.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-dark-500">
        <span>Tipo atual:</span>
        <span className={cn(
          'px-2 py-1 rounded-full text-xs font-medium text-white',
          TYPE_COLORS[currentType]
        )}>
          {PRODUCT_TYPE_LABELS[currentType]}
        </span>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-dark-700 dark:text-dark-300">
          Converter para:
        </label>
        <ProductTypeSelector
          value={selectedType || currentType}
          onChange={setSelectedType}
          allowedTypes={canConvertTo}
          showDescriptions={false}
          layout="list"
        />
      </div>

      {selectedType && selectedType !== currentType && (
        <button
          onClick={() => onConvert(selectedType)}
          disabled={isLoading}
          className={cn(
            'w-full py-2 px-4 rounded-lg font-medium transition-colors',
            'bg-primary-600 text-white hover:bg-primary-700',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isLoading ? 'Convertendo...' : `Converter para ${PRODUCT_TYPE_LABELS[selectedType]}`}
        </button>
      )}
    </div>
  );
}

// Badge for displaying product type
interface ProductTypeBadgeProps {
  type: ProductType;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function ProductTypeBadge({
  type,
  size = 'md',
  showIcon = true,
}: ProductTypeBadgeProps) {
  const Icon = TYPE_ICONS[type];

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full font-medium text-white',
      TYPE_COLORS[type],
      sizeClasses[size]
    )}>
      {showIcon && <Icon className={iconSizes[size]} />}
      {PRODUCT_TYPE_LABELS[type]}
    </span>
  );
}
