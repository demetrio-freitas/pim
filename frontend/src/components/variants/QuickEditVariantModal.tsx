'use client';

import { useState, useEffect, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Save,
  DollarSign,
  Boxes,
  Image as ImageIcon,
  Upload,
  Check,
  Loader2,
  Trash2,
  Copy,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';

interface VariantData {
  id: string;
  sku: string;
  name?: string;
  price: number | null;
  stockQuantity: number;
  isActive: boolean;
  mainImage: string | null;
  axisValues: { axisName: string; value: string }[];
}

interface QuickEditVariantModalProps {
  variant: VariantData;
  allVariants?: VariantData[];
  currentIndex?: number;
  onSave: (data: Partial<VariantData>) => Promise<void>;
  onClose: () => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
  onDelete?: () => void;
  isLoading?: boolean;
}

export function QuickEditVariantModal({
  variant,
  allVariants,
  currentIndex = 0,
  onSave,
  onClose,
  onNavigate,
  onDelete,
  isLoading = false,
}: QuickEditVariantModalProps) {
  const [formData, setFormData] = useState({
    sku: variant.sku,
    price: variant.price?.toString() || '',
    stockQuantity: variant.stockQuantity.toString(),
    isActive: variant.isActive,
    mainImage: variant.mainImage,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const priceInputRef = useRef<HTMLInputElement>(null);

  // Atualizar form quando variante mudar
  useEffect(() => {
    setFormData({
      sku: variant.sku,
      price: variant.price?.toString() || '',
      stockQuantity: variant.stockQuantity.toString(),
      isActive: variant.isActive,
      mainImage: variant.mainImage,
    });
    setHasChanges(false);
    setErrors({});
  }, [variant]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        handleSave();
      } else if (e.key === 'ArrowLeft' && onNavigate && !hasChanges) {
        onNavigate('prev');
      } else if (e.key === 'ArrowRight' && onNavigate && !hasChanges) {
        onNavigate('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasChanges, onNavigate, onClose]);

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.sku.trim()) {
      newErrors.sku = 'SKU é obrigatório';
    }

    if (formData.price && isNaN(parseFloat(formData.price))) {
      newErrors.price = 'Preço inválido';
    }

    if (formData.stockQuantity && isNaN(parseInt(formData.stockQuantity))) {
      newErrors.stockQuantity = 'Estoque inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      await onSave({
        sku: formData.sku,
        price: formData.price ? parseFloat(formData.price) : null,
        stockQuantity: parseInt(formData.stockQuantity) || 0,
        isActive: formData.isActive,
        mainImage: formData.mainImage,
      });
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndNext = async () => {
    await handleSave();
    if (onNavigate) {
      onNavigate('next');
    }
  };

  const canNavigatePrev = onNavigate && currentIndex > 0;
  const canNavigateNext = onNavigate && allVariants && currentIndex < allVariants.length - 1;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-dark-200 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Navigation arrows */}
              {onNavigate && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onNavigate('prev')}
                    disabled={!canNavigatePrev || hasChanges}
                    className={cn(
                      'p-1.5 rounded-lg transition-colors',
                      canNavigatePrev && !hasChanges
                        ? 'hover:bg-dark-100 dark:hover:bg-dark-700 text-dark-600'
                        : 'text-dark-300 cursor-not-allowed'
                    )}
                    title="Anterior (←)"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-xs text-dark-500 min-w-[60px] text-center">
                    {currentIndex + 1} / {allVariants?.length || 1}
                  </span>
                  <button
                    onClick={() => onNavigate('next')}
                    disabled={!canNavigateNext || hasChanges}
                    className={cn(
                      'p-1.5 rounded-lg transition-colors',
                      canNavigateNext && !hasChanges
                        ? 'hover:bg-dark-100 dark:hover:bg-dark-700 text-dark-600'
                        : 'text-dark-300 cursor-not-allowed'
                    )}
                    title="Próxima (→)"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-dark-900 dark:text-white">
                  Edição Rápida
                </h3>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {variant.axisValues.map((av, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                    >
                      {av.axisName}: {av.value}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-dark-500" />
            </button>
          </div>

          {hasChanges && (
            <div className="mt-2 flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              Alterações não salvas
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Image section */}
          <div className="flex gap-4">
            <div className="w-24 h-24 bg-dark-100 dark:bg-dark-700 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-dashed border-dark-300 dark:border-dark-600">
              {formData.mainImage ? (
                <img
                  src={formData.mainImage}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-2">
                  <ImageIcon className="w-8 h-8 text-dark-400 mx-auto mb-1" />
                  <span className="text-[10px] text-dark-400">Sem imagem</span>
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col justify-center gap-2">
              <button className="btn-secondary text-sm flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Fazer upload
              </button>
              <button className="text-xs text-dark-500 hover:text-primary-600 transition-colors">
                Selecionar da galeria
              </button>
            </div>
          </div>

          {/* SKU */}
          <div>
            <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
              SKU
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => updateField('sku', e.target.value)}
                className={cn(
                  'input w-full font-mono pr-10',
                  errors.sku && 'border-red-500 focus:ring-red-500'
                )}
              />
              <button
                onClick={() => navigator.clipboard.writeText(formData.sku)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-dark-100 dark:hover:bg-dark-700 rounded transition-colors"
                title="Copiar SKU"
              >
                <Copy className="w-4 h-4 text-dark-400" />
              </button>
            </div>
            {errors.sku && (
              <p className="text-xs text-red-500 mt-1">{errors.sku}</p>
            )}
          </div>

          {/* Price and Stock row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                Preço
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                <input
                  ref={priceInputRef}
                  type="number"
                  value={formData.price}
                  onChange={(e) => updateField('price', e.target.value)}
                  className={cn(
                    'input pl-9 w-full',
                    errors.price && 'border-red-500 focus:ring-red-500'
                  )}
                  placeholder="0,00"
                  step="0.01"
                />
              </div>
              {errors.price && (
                <p className="text-xs text-red-500 mt-1">{errors.price}</p>
              )}
            </div>

            {/* Stock */}
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                Estoque
              </label>
              <div className="relative">
                <Boxes className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                <input
                  type="number"
                  value={formData.stockQuantity}
                  onChange={(e) => updateField('stockQuantity', e.target.value)}
                  className={cn(
                    'input pl-9 w-full',
                    errors.stockQuantity && 'border-red-500 focus:ring-red-500'
                  )}
                  placeholder="0"
                />
              </div>
              {errors.stockQuantity && (
                <p className="text-xs text-red-500 mt-1">{errors.stockQuantity}</p>
              )}
            </div>
          </div>

          {/* Status toggle */}
          <div className="flex items-center justify-between p-3 bg-dark-50 dark:bg-dark-700/50 rounded-lg">
            <div>
              <span className="font-medium text-dark-700 dark:text-dark-300">
                Status da variante
              </span>
              <p className="text-xs text-dark-500 mt-0.5">
                {formData.isActive
                  ? 'Variante ativa e disponível para venda'
                  : 'Variante inativa e oculta do catálogo'}
              </p>
            </div>
            <button
              onClick={() => updateField('isActive', !formData.isActive)}
              className={cn(
                'relative w-12 h-6 rounded-full transition-colors',
                formData.isActive
                  ? 'bg-green-500'
                  : 'bg-dark-300 dark:bg-dark-600'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
                  formData.isActive ? 'right-1' : 'left-1'
                )}
              />
            </button>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-dark-50 dark:bg-dark-700/50 rounded-lg">
              <span className={cn(
                'text-lg font-bold',
                !formData.price ? 'text-dark-400' : 'text-dark-900 dark:text-white'
              )}>
                {formData.price ? formatCurrency(parseFloat(formData.price)) : '-'}
              </span>
              <p className="text-[10px] text-dark-500 mt-0.5">Preço</p>
            </div>
            <div className="p-2 bg-dark-50 dark:bg-dark-700/50 rounded-lg">
              <span className={cn(
                'text-lg font-bold',
                parseInt(formData.stockQuantity) <= 0 ? 'text-red-500' :
                parseInt(formData.stockQuantity) < 10 ? 'text-yellow-500' : 'text-green-500'
              )}>
                {formData.stockQuantity || '0'}
              </span>
              <p className="text-[10px] text-dark-500 mt-0.5">Estoque</p>
            </div>
            <div className="p-2 bg-dark-50 dark:bg-dark-700/50 rounded-lg">
              <span className={cn(
                'text-lg font-bold',
                formData.isActive ? 'text-green-500' : 'text-dark-400'
              )}>
                {formData.isActive ? 'Ativa' : 'Inativa'}
              </span>
              <p className="text-[10px] text-dark-500 mt-0.5">Status</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dark-200 dark:border-dark-700 flex items-center justify-between">
          <div>
            {onDelete && (
              <button
                onClick={onDelete}
                className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Excluir variante
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="btn-secondary"
              disabled={isSaving}
            >
              Cancelar
            </button>

            {canNavigateNext && (
              <button
                onClick={handleSaveAndNext}
                disabled={isSaving || !hasChanges}
                className="btn-secondary flex items-center gap-1.5"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar e próxima
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="btn-primary flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Salvar
                </>
              )}
            </button>
          </div>
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="px-4 py-2 bg-dark-50 dark:bg-dark-900 border-t border-dark-200 dark:border-dark-700">
          <div className="flex items-center justify-center gap-4 text-[10px] text-dark-400">
            <span><kbd className="px-1.5 py-0.5 bg-white dark:bg-dark-700 rounded border border-dark-200 dark:border-dark-600">Esc</kbd> Fechar</span>
            <span><kbd className="px-1.5 py-0.5 bg-white dark:bg-dark-700 rounded border border-dark-200 dark:border-dark-600">⌘+Enter</kbd> Salvar</span>
            {onNavigate && (
              <>
                <span><kbd className="px-1.5 py-0.5 bg-white dark:bg-dark-700 rounded border border-dark-200 dark:border-dark-600">←</kbd> Anterior</span>
                <span><kbd className="px-1.5 py-0.5 bg-white dark:bg-dark-700 rounded border border-dark-200 dark:border-dark-600">→</kbd> Próxima</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
