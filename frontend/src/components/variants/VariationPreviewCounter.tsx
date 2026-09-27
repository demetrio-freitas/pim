'use client';

import { useMemo } from 'react';
import { Calculator, Layers, TrendingUp, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AxisConfig {
  name: string;
  values: string[];
}

interface VariationPreviewCounterProps {
  axes: AxisConfig[];
  maxRecommended?: number;
  className?: string;
}

export function VariationPreviewCounter({
  axes,
  maxRecommended = 100,
  className,
}: VariationPreviewCounterProps) {
  const { totalCombinations, calculation, hasValues } = useMemo(() => {
    const axesWithValues = axes.filter(a => a.values.length > 0);

    if (axesWithValues.length === 0) {
      return { totalCombinations: 0, calculation: '', hasValues: false };
    }

    const total = axesWithValues.reduce((acc, axis) => acc * axis.values.length, 1);
    const calc = axesWithValues
      .map(a => `${a.name} (${a.values.length})`)
      .join(' × ');

    return { totalCombinations: total, calculation: calc, hasValues: true };
  }, [axes]);

  const isWarning = totalCombinations > maxRecommended;
  const isCritical = totalCombinations > maxRecommended * 5;

  if (!hasValues) {
    return (
      <div className={cn(
        'p-4 rounded-xl bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700',
        className
      )}>
        <div className="flex items-center gap-3 text-dark-500">
          <Calculator className="w-5 h-5" />
          <span className="text-sm">
            Adicione valores aos eixos para ver o preview das combinações
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden transition-all',
      isCritical
        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        : isWarning
        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
        : 'bg-gradient-to-br from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border-primary-200 dark:border-primary-800',
      className
    )}>
      {/* Main counter */}
      <div className="p-4">
        <div className="flex items-start gap-4">
          <div className={cn(
            'p-3 rounded-xl',
            isCritical
              ? 'bg-red-100 dark:bg-red-900/40'
              : isWarning
              ? 'bg-yellow-100 dark:bg-yellow-900/40'
              : 'bg-primary-100 dark:bg-primary-900/40'
          )}>
            <Layers className={cn(
              'w-6 h-6',
              isCritical
                ? 'text-red-600 dark:text-red-400'
                : isWarning
                ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-primary-600 dark:text-primary-400'
            )} />
          </div>

          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className={cn(
                'text-3xl font-bold',
                isCritical
                  ? 'text-red-700 dark:text-red-300'
                  : isWarning
                  ? 'text-yellow-700 dark:text-yellow-300'
                  : 'text-primary-700 dark:text-primary-300'
              )}>
                {totalCombinations.toLocaleString('pt-BR')}
              </span>
              <span className={cn(
                'text-sm font-medium',
                isCritical
                  ? 'text-red-600 dark:text-red-400'
                  : isWarning
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-primary-600 dark:text-primary-400'
              )}>
                variantes serão criadas
              </span>
            </div>

            <div className={cn(
              'text-sm mt-1',
              isCritical
                ? 'text-red-600 dark:text-red-400'
                : isWarning
                ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-primary-600/80 dark:text-primary-400/80'
            )}>
              {calculation} = {totalCombinations}
            </div>
          </div>
        </div>
      </div>

      {/* Warning messages */}
      {(isWarning || isCritical) && (
        <div className={cn(
          'px-4 py-3 border-t flex items-start gap-2',
          isCritical
            ? 'bg-red-100/50 dark:bg-red-900/30 border-red-200 dark:border-red-800'
            : 'bg-yellow-100/50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800'
        )}>
          <AlertTriangle className={cn(
            'w-4 h-4 flex-shrink-0 mt-0.5',
            isCritical ? 'text-red-600' : 'text-yellow-600'
          )} />
          <div className={cn(
            'text-sm',
            isCritical ? 'text-red-700 dark:text-red-300' : 'text-yellow-700 dark:text-yellow-300'
          )}>
            {isCritical ? (
              <>
                <strong>Muitas variantes!</strong> Isso pode causar lentidão no sistema.
                Considere reduzir o número de valores ou usar variações agrupadas.
              </>
            ) : (
              <>
                <strong>Atenção:</strong> Muitas variantes podem dificultar o gerenciamento.
                Recomendado: até {maxRecommended} combinações.
              </>
            )}
          </div>
        </div>
      )}

      {/* Axes breakdown */}
      <div className={cn(
        'px-4 py-3 border-t',
        isCritical
          ? 'bg-red-100/30 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          : isWarning
          ? 'bg-yellow-100/30 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
          : 'bg-white/50 dark:bg-black/10 border-primary-200 dark:border-primary-800'
      )}>
        <div className="flex flex-wrap gap-2">
          {axes.filter(a => a.values.length > 0).map((axis, idx) => (
            <div
              key={idx}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm flex items-center gap-2',
                'bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700'
              )}
            >
              <span className="font-medium text-dark-700 dark:text-dark-300">
                {axis.name}
              </span>
              <span className="px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 rounded font-bold text-xs">
                {axis.values.length}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Info tip */}
      <div className={cn(
        'px-4 py-2 border-t flex items-center gap-2',
        isCritical
          ? 'bg-red-100/20 dark:bg-red-900/10 border-red-200 dark:border-red-800'
          : isWarning
          ? 'bg-yellow-100/20 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800'
          : 'bg-primary-100/20 dark:bg-primary-900/10 border-primary-200 dark:border-primary-800'
      )}>
        <Info className="w-3.5 h-3.5 text-dark-400" />
        <span className="text-xs text-dark-500">
          Cada combinação gera um SKU único que pode ser editado individualmente
        </span>
      </div>
    </div>
  );
}

// Componente de preview das combinações
interface CombinationPreviewProps {
  axes: AxisConfig[];
  selectedCombinations?: Set<number>;
  onToggleCombination?: (index: number) => void;
  maxDisplay?: number;
  className?: string;
}

export function CombinationPreview({
  axes,
  selectedCombinations,
  onToggleCombination,
  maxDisplay = 50,
  className,
}: CombinationPreviewProps) {
  const combinations = useMemo(() => {
    const axesWithValues = axes.filter(a => a.values.length > 0);
    if (axesWithValues.length === 0) return [];

    const result: { index: number; values: { axis: string; value: string }[] }[] = [];

    const generate = (axisIndex: number, current: { axis: string; value: string }[]) => {
      if (axisIndex === axesWithValues.length) {
        result.push({ index: result.length, values: [...current] });
        return;
      }

      const axis = axesWithValues[axisIndex];
      for (const value of axis.values) {
        current.push({ axis: axis.name, value });
        generate(axisIndex + 1, current);
        current.pop();
      }
    };

    generate(0, []);
    return result;
  }, [axes]);

  const displayCombinations = combinations.slice(0, maxDisplay);
  const hasMore = combinations.length > maxDisplay;

  if (combinations.length === 0) {
    return null;
  }

  return (
    <div className={cn('rounded-lg border border-dark-200 dark:border-dark-700 overflow-hidden', className)}>
      <div className="p-3 bg-dark-50 dark:bg-dark-800 border-b border-dark-200 dark:border-dark-700">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-dark-700 dark:text-dark-300">
            Preview das combinações
          </span>
          {selectedCombinations && (
            <span className="text-xs text-dark-500">
              {selectedCombinations.size} de {combinations.length} selecionadas
            </span>
          )}
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto">
        {displayCombinations.map((combo) => (
          <label
            key={combo.index}
            className={cn(
              'flex items-center gap-3 px-3 py-2 border-b border-dark-100 dark:border-dark-800 last:border-0 hover:bg-dark-50 dark:hover:bg-dark-800/50 transition-colors',
              onToggleCombination && 'cursor-pointer'
            )}
          >
            {onToggleCombination && (
              <input
                type="checkbox"
                checked={selectedCombinations?.has(combo.index) ?? true}
                onChange={() => onToggleCombination(combo.index)}
                className="rounded border-dark-300"
              />
            )}
            <div className="flex flex-wrap gap-1.5">
              {combo.values.map((v, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 text-xs rounded-md bg-dark-100 dark:bg-dark-700 text-dark-700 dark:text-dark-300"
                >
                  <span className="text-dark-400">{v.axis}:</span> {v.value}
                </span>
              ))}
            </div>
          </label>
        ))}
      </div>

      {hasMore && (
        <div className="p-3 bg-dark-50 dark:bg-dark-800 border-t border-dark-200 dark:border-dark-700 text-center">
          <span className="text-xs text-dark-500">
            ... e mais {combinations.length - maxDisplay} combinações
          </span>
        </div>
      )}
    </div>
  );
}
