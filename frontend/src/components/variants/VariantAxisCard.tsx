'use client';

import { useState, useRef, useEffect } from 'react';
import {
  X,
  Plus,
  Palette,
  Ruler,
  Shirt,
  Zap,
  Package,
  Sparkles,
  ChevronDown,
  GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Configuração dos eixos predefinidos com ícones e sugestões
export const PREDEFINED_AXES = {
  cor: {
    name: 'Cor',
    icon: Palette,
    color: 'blue',
    suggestions: ['Preto', 'Branco', 'Azul', 'Vermelho', 'Verde', 'Amarelo', 'Rosa', 'Cinza', 'Marrom', 'Laranja', 'Roxo', 'Bege'],
    colorCodes: {
      'Preto': '#000000',
      'Branco': '#FFFFFF',
      'Azul': '#3B82F6',
      'Vermelho': '#EF4444',
      'Verde': '#22C55E',
      'Amarelo': '#EAB308',
      'Rosa': '#EC4899',
      'Cinza': '#6B7280',
      'Marrom': '#92400E',
      'Laranja': '#F97316',
      'Roxo': '#8B5CF6',
      'Bege': '#D4B896',
    }
  },
  tamanho: {
    name: 'Tamanho',
    icon: Ruler,
    color: 'green',
    suggestions: ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG', '36', '38', '40', '42', '44', '46', '48'],
  },
  material: {
    name: 'Material',
    icon: Shirt,
    color: 'orange',
    suggestions: ['Algodão', 'Poliéster', 'Linho', 'Seda', 'Lã', 'Couro', 'Jeans', 'Viscose', 'Nylon', 'Elastano'],
  },
  voltagem: {
    name: 'Voltagem',
    icon: Zap,
    color: 'yellow',
    suggestions: ['110V', '220V', 'Bivolt'],
  },
  capacidade: {
    name: 'Capacidade',
    icon: Package,
    color: 'purple',
    suggestions: ['128GB', '256GB', '512GB', '1TB', '2TB', '4GB', '8GB', '16GB', '32GB', '64GB'],
  },
};

interface VariantAxisCardProps {
  axisId: string;
  axisName: string;
  axisCode: string;
  values: string[];
  onValuesChange: (values: string[]) => void;
  onRemove?: () => void;
  isSelected?: boolean;
  onSelect?: () => void;
  mode?: 'select' | 'edit';
  className?: string;
}

export function VariantAxisCard({
  axisId,
  axisName,
  axisCode,
  values,
  onValuesChange,
  onRemove,
  isSelected,
  onSelect,
  mode = 'edit',
  className,
}: VariantAxisCardProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Encontrar configuração do eixo
  const axisConfig = PREDEFINED_AXES[axisCode.toLowerCase() as keyof typeof PREDEFINED_AXES];
  const Icon = axisConfig?.icon || Package;
  const colorClass = axisConfig?.color || 'gray';
  const suggestions = axisConfig?.suggestions || [];
  const colorCodes = (axisConfig as any)?.colorCodes || {};

  // Filtrar sugestões baseado no input
  const filteredSuggestions = suggestions.filter(
    s => s.toLowerCase().includes(inputValue.toLowerCase()) && !values.includes(s)
  );

  // Fechar sugestões ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addValue = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !values.includes(trimmed)) {
      onValuesChange([...values, trimmed]);
    }
    setInputValue('');
    setShowSuggestions(false);
  };

  const removeValue = (value: string) => {
    onValuesChange(values.filter(v => v !== value));
  };

  const addAllSuggestions = () => {
    const allValues = [...values, ...suggestions];
    const uniqueValues = allValues.filter((v, i, arr) => arr.indexOf(v) === i);
    onValuesChange(uniqueValues);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue) {
      e.preventDefault();
      addValue(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && values.length > 0) {
      removeValue(values[values.length - 1]);
    }
  };

  const bgColorMap: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    gray: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800',
  };

  const iconColorMap: Record<string, string> = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    orange: 'text-orange-600 dark:text-orange-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    purple: 'text-purple-600 dark:text-purple-400',
    gray: 'text-gray-600 dark:text-gray-400',
  };

  const chipColorMap: Record<string, string> = {
    blue: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    green: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
    orange: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
    purple: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
    gray: 'bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300',
  };

  if (mode === 'select') {
    return (
      <button
        onClick={onSelect}
        className={cn(
          'p-4 rounded-xl border-2 transition-all text-left',
          isSelected
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md'
            : 'border-dark-200 dark:border-dark-700 hover:border-primary-300 hover:bg-dark-50 dark:hover:bg-dark-800',
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            bgColorMap[colorClass]
          )}>
            <Icon className={cn('w-5 h-5', iconColorMap[colorClass])} />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-dark-900 dark:text-white">
              {axisName}
            </h4>
            <p className="text-xs text-dark-500 mt-0.5">
              {suggestions.slice(0, 4).join(', ')}...
            </p>
          </div>
          {isSelected && (
            <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </div>
      </button>
    );
  }

  return (
    <div className={cn(
      'rounded-xl border transition-all',
      bgColorMap[colorClass],
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-inherit">
        <div className="flex items-center gap-2">
          <div className="cursor-grab opacity-50 hover:opacity-100">
            <GripVertical className="w-4 h-4 text-dark-400" />
          </div>
          <Icon className={cn('w-5 h-5', iconColorMap[colorClass])} />
          <span className="font-medium text-dark-800 dark:text-dark-200">
            {axisName}
          </span>
          <span className="text-xs text-dark-500 bg-white/50 dark:bg-black/20 px-1.5 py-0.5 rounded">
            {values.length} valor{values.length !== 1 ? 'es' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {suggestions.length > 0 && (
            <button
              onClick={addAllSuggestions}
              className={cn(
                'text-xs px-2 py-1 rounded-md flex items-center gap-1 transition-colors',
                'hover:bg-white/50 dark:hover:bg-black/20',
                iconColorMap[colorClass]
              )}
              title="Adicionar todas as sugestões"
            >
              <Sparkles className="w-3 h-3" />
              Sugestões
            </button>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              className="p-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors"
              title="Remover eixo"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Values */}
      <div className="p-3">
        <div className="flex flex-wrap gap-2 mb-2">
          {values.map((value, idx) => (
            <span
              key={idx}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium',
                chipColorMap[colorClass]
              )}
            >
              {colorCodes[value] && (
                <span
                  className="w-3 h-3 rounded-full border border-white/30"
                  style={{ backgroundColor: colorCodes[value] }}
                />
              )}
              {value}
              <button
                onClick={() => removeValue(value)}
                className="hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>

        {/* Input with autocomplete */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder={`Adicionar ${axisName.toLowerCase()}... (Enter para confirmar)`}
            className="w-full px-3 py-2 text-sm rounded-lg border border-inherit bg-white/50 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          />

          {/* Suggestions dropdown */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-dark-800 rounded-lg border border-dark-200 dark:border-dark-700 shadow-lg max-h-48 overflow-y-auto z-10"
            >
              {filteredSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => addValue(suggestion)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-dark-50 dark:hover:bg-dark-700 flex items-center gap-2 transition-colors"
                >
                  {colorCodes[suggestion] && (
                    <span
                      className="w-4 h-4 rounded-full border border-dark-200"
                      style={{ backgroundColor: colorCodes[suggestion] }}
                    />
                  )}
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Componente para selecionar novos eixos
interface AxisSelectorProps {
  selectedAxes: string[];
  onToggleAxis: (axisCode: string) => void;
  customAxes?: { code: string; name: string }[];
  onAddCustomAxis?: (name: string) => void;
}

export function AxisSelector({
  selectedAxes,
  onToggleAxis,
  customAxes = [],
  onAddCustomAxis,
}: AxisSelectorProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customAxisName, setCustomAxisName] = useState('');

  const handleAddCustom = () => {
    if (customAxisName.trim()) {
      onAddCustomAxis?.(customAxisName.trim());
      setCustomAxisName('');
      setShowCustomInput(false);
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-dark-700 dark:text-dark-300">
        Selecione os eixos de variação
      </h4>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Object.entries(PREDEFINED_AXES).map(([code, config]) => (
          <VariantAxisCard
            key={code}
            axisId={code}
            axisCode={code}
            axisName={config.name}
            values={[]}
            onValuesChange={() => {}}
            isSelected={selectedAxes.includes(code)}
            onSelect={() => onToggleAxis(code)}
            mode="select"
          />
        ))}

        {customAxes.map((axis) => (
          <VariantAxisCard
            key={axis.code}
            axisId={axis.code}
            axisCode={axis.code}
            axisName={axis.name}
            values={[]}
            onValuesChange={() => {}}
            isSelected={selectedAxes.includes(axis.code)}
            onSelect={() => onToggleAxis(axis.code)}
            mode="select"
          />
        ))}

        {/* Add custom axis */}
        {showCustomInput ? (
          <div className="p-4 rounded-xl border-2 border-dashed border-dark-300 dark:border-dark-600">
            <input
              type="text"
              value={customAxisName}
              onChange={(e) => setCustomAxisName(e.target.value)}
              placeholder="Nome do eixo"
              className="w-full px-3 py-2 text-sm rounded-lg border border-dark-200 dark:border-dark-700 mb-2"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddCustom();
                if (e.key === 'Escape') setShowCustomInput(false);
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddCustom}
                className="flex-1 btn-primary text-sm py-1.5"
              >
                Adicionar
              </button>
              <button
                onClick={() => setShowCustomInput(false)}
                className="btn-secondary text-sm py-1.5"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCustomInput(true)}
            className="p-4 rounded-xl border-2 border-dashed border-dark-300 dark:border-dark-600 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all flex items-center justify-center gap-2 text-dark-500 hover:text-primary-600"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Eixo Customizado</span>
          </button>
        )}
      </div>
    </div>
  );
}
