'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText,
  Package,
  Box,
  Settings,
  CheckCircle,
  Layers,
  Wrench,
  Archive,
  Building,
  Briefcase,
  Boxes,
  HelpCircle,
  ChevronDown,
  Search,
  AlertCircle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SpedItemType,
  SpedItemTypeResponse,
  SPED_ITEM_TYPE_LABELS,
  SPED_ITEM_TYPE_DESCRIPTIONS,
  SPED_ITEM_TYPE_CODES,
  ProductType,
} from '@/types';
import { api } from '@/lib/api';

interface SpedItemTypeSelectorProps {
  value: SpedItemType | null;
  onChange: (type: SpedItemType | null) => void;
  productType?: ProductType;
  disabled?: boolean;
  required?: boolean;
  showDescription?: boolean;
  error?: string;
}

// Ícones para cada tipo SPED
const TYPE_ICONS: Record<SpedItemType, React.ComponentType<{ className?: string }>> = {
  MERCADORIA_REVENDA: Package,
  MATERIA_PRIMA: Boxes,
  EMBALAGEM: Box,
  PRODUTO_EM_PROCESSO: Settings,
  PRODUTO_ACABADO: CheckCircle,
  SUBPRODUTO: Layers,
  PRODUTO_INTERMEDIARIO: Wrench,
  MATERIAL_USO_CONSUMO: Archive,
  ATIVO_IMOBILIZADO: Building,
  SERVICOS: Briefcase,
  OUTROS_INSUMOS: Boxes,
  OUTRAS: HelpCircle,
};

// Cores para cada tipo SPED
const TYPE_COLORS: Record<SpedItemType, string> = {
  MERCADORIA_REVENDA: 'bg-blue-500',
  MATERIA_PRIMA: 'bg-amber-500',
  EMBALAGEM: 'bg-purple-500',
  PRODUTO_EM_PROCESSO: 'bg-orange-500',
  PRODUTO_ACABADO: 'bg-green-500',
  SUBPRODUTO: 'bg-teal-500',
  PRODUTO_INTERMEDIARIO: 'bg-indigo-500',
  MATERIAL_USO_CONSUMO: 'bg-gray-500',
  ATIVO_IMOBILIZADO: 'bg-red-500',
  SERVICOS: 'bg-cyan-500',
  OUTROS_INSUMOS: 'bg-pink-500',
  OUTRAS: 'bg-slate-500',
};

// Tipos SPED disponíveis (ordenados pelo código)
const SPED_TYPES: SpedItemType[] = [
  'MERCADORIA_REVENDA',
  'MATERIA_PRIMA',
  'EMBALAGEM',
  'PRODUTO_EM_PROCESSO',
  'PRODUTO_ACABADO',
  'SUBPRODUTO',
  'PRODUTO_INTERMEDIARIO',
  'MATERIAL_USO_CONSUMO',
  'ATIVO_IMOBILIZADO',
  'SERVICOS',
  'OUTROS_INSUMOS',
  'OUTRAS',
];

export function SpedItemTypeSelector({
  value,
  onChange,
  productType,
  disabled = false,
  required = false,
  showDescription = true,
  error,
}: SpedItemTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrar tipos baseado na busca
  const filteredTypes = useMemo(() => {
    if (!searchQuery) return SPED_TYPES;
    const query = searchQuery.toLowerCase();
    return SPED_TYPES.filter(
      (type) =>
        SPED_ITEM_TYPE_LABELS[type].toLowerCase().includes(query) ||
        SPED_ITEM_TYPE_DESCRIPTIONS[type].toLowerCase().includes(query) ||
        SPED_ITEM_TYPE_CODES[type].includes(query)
    );
  }, [searchQuery]);

  // Efeito para definir valor padrão baseado no tipo do produto
  useEffect(() => {
    if (!value && productType) {
      if (productType === 'VIRTUAL') {
        onChange('SERVICOS');
      }
    }
  }, [productType, value, onChange]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-sped-selector]')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = useCallback(
    (type: SpedItemType) => {
      onChange(type);
      setIsOpen(false);
      setSearchQuery('');
    },
    [onChange]
  );

  const selectedType = value;
  const Icon = selectedType ? TYPE_ICONS[selectedType] : FileText;

  return (
    <div className="space-y-2" data-sped-selector>
      {/* Label */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-dark-700 dark:text-dark-300">
          Tipo do Item SPED
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <a
          href="https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/declaracoes-e-demonstrativos/sped-sistema-publico-de-escrituracao-digital/escrituracao-fiscal-digital-efd"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
        >
          <Info className="w-3 h-3" />
          Saiba mais
        </a>
      </div>

      {/* Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-all text-left',
            isOpen
              ? 'border-primary-500 ring-2 ring-primary-500/20'
              : 'border-dark-300 dark:border-dark-600',
            error
              ? 'border-red-500 dark:border-red-500'
              : '',
            disabled
              ? 'opacity-50 cursor-not-allowed bg-dark-100 dark:bg-dark-800'
              : 'bg-white dark:bg-dark-800 hover:border-dark-400 dark:hover:border-dark-500 cursor-pointer'
          )}
        >
          {/* Ícone */}
          <div
            className={cn(
              'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
              selectedType ? TYPE_COLORS[selectedType] : 'bg-dark-200 dark:bg-dark-700'
            )}
          >
            <Icon className={cn('w-5 h-5', selectedType ? 'text-white' : 'text-dark-500')} />
          </div>

          {/* Texto */}
          <div className="flex-1 min-w-0">
            {selectedType ? (
              <>
                <p className="font-medium text-dark-900 dark:text-white">
                  {SPED_ITEM_TYPE_LABELS[selectedType]}
                </p>
                {showDescription && (
                  <p className="text-sm text-dark-500 truncate">
                    {SPED_ITEM_TYPE_DESCRIPTIONS[selectedType]}
                  </p>
                )}
              </>
            ) : (
              <p className="text-dark-500">Selecione o tipo do item...</p>
            )}
          </div>

          {/* Chevron */}
          <ChevronDown
            className={cn(
              'w-5 h-5 text-dark-400 transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-2 bg-white dark:bg-dark-800 rounded-xl shadow-xl border border-dark-200 dark:border-dark-700 overflow-hidden">
            {/* Search */}
            <div className="p-3 border-b border-dark-200 dark:border-dark-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar tipo..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-dark-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Options */}
            <div className="max-h-80 overflow-y-auto">
              {filteredTypes.length === 0 ? (
                <div className="p-4 text-center text-dark-500">
                  Nenhum tipo encontrado
                </div>
              ) : (
                filteredTypes.map((type) => {
                  const TypeIcon = TYPE_ICONS[type];
                  const isSelected = value === type;
                  const isVirtualOnlyType = type === 'SERVICOS';
                  const isPhysicalProductWithServices =
                    productType && productType !== 'VIRTUAL' && type === 'SERVICOS';

                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleSelect(type)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                        isSelected
                          ? 'bg-primary-50 dark:bg-primary-900/20'
                          : 'hover:bg-dark-50 dark:hover:bg-dark-700'
                      )}
                    >
                      {/* Ícone */}
                      <div
                        className={cn(
                          'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
                          isSelected ? TYPE_COLORS[type] : 'bg-dark-100 dark:bg-dark-700'
                        )}
                      >
                        <TypeIcon
                          className={cn(
                            'w-4 h-4',
                            isSelected ? 'text-white' : 'text-dark-500'
                          )}
                        />
                      </div>

                      {/* Texto */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            'font-medium',
                            isSelected
                              ? 'text-primary-600 dark:text-primary-400'
                              : 'text-dark-900 dark:text-white'
                          )}
                        >
                          {SPED_ITEM_TYPE_LABELS[type]}
                        </p>
                        <p className="text-sm text-dark-500 truncate">
                          {SPED_ITEM_TYPE_DESCRIPTIONS[type]}
                        </p>
                      </div>

                      {/* Warning para produtos físicos selecionando Serviços */}
                      {isPhysicalProductWithServices && (
                        <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      )}

                      {/* Checkmark */}
                      {isSelected && (
                        <CheckCircle className="w-5 h-5 text-primary-500 flex-shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}

      {/* Info about Virtual products */}
      {productType === 'VIRTUAL' && value !== 'SERVICOS' && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Produtos virtuais geralmente são classificados como &quot;09 - Serviços&quot; para fins fiscais.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Badge para exibir o tipo SPED de forma compacta
 */
interface SpedItemTypeBadgeProps {
  type: SpedItemType;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showCode?: boolean;
}

export function SpedItemTypeBadge({
  type,
  size = 'md',
  showIcon = true,
  showCode = true,
}: SpedItemTypeBadgeProps) {
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
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium text-white',
        TYPE_COLORS[type],
        sizeClasses[size]
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {showCode ? SPED_ITEM_TYPE_CODES[type] : ''} {SPED_ITEM_TYPE_DESCRIPTIONS[type].split(' ')[0]}
    </span>
  );
}

/**
 * Card informativo sobre SPED
 */
export function SpedInfoCard() {
  return (
    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
      <div className="flex items-start gap-3">
        <FileText className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-medium text-blue-800 dark:text-blue-200">
            Tipo do Item SPED
          </h4>
          <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
            O Tipo do Item é obrigatório para geração do SPED Fiscal (EFD ICMS/IPI) e NF-e.
            A classificação correta determina o tratamento tributário aplicável ao produto.
          </p>
          <a
            href="https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/declaracoes-e-demonstrativos/sped-sistema-publico-de-escrituracao-digital"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            Consultar tabela oficial
            <Info className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
