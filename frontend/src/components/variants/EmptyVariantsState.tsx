'use client';

import { useState } from 'react';
import {
  Package,
  Palette,
  Ruler,
  Layers,
  Sparkles,
  ArrowRight,
  PlayCircle,
  CheckCircle2,
  Settings2,
  Grid3X3,
  ListChecks,
  Edit3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyVariantsStateProps {
  productType?: 'SIMPLE' | 'CONFIGURABLE';
  hasAxesConfigured?: boolean;
  onStartConfiguration: () => void;
  onGenerateVariants?: () => void;
  className?: string;
}

export function EmptyVariantsState({
  productType = 'CONFIGURABLE',
  hasAxesConfigured = false,
  onStartConfiguration,
  onGenerateVariants,
  className,
}: EmptyVariantsStateProps) {
  const [activeStep, setActiveStep] = useState(hasAxesConfigured ? 2 : 0);

  const steps = [
    {
      number: 1,
      title: 'Adicione eixos de variação',
      description: 'Escolha os atributos que diferenciam suas variantes',
      icon: Settings2,
      examples: ['Cor', 'Tamanho', 'Material', 'Voltagem'],
      color: 'blue',
    },
    {
      number: 2,
      title: 'Defina os valores',
      description: 'Adicione as opções disponíveis para cada eixo',
      icon: Edit3,
      examples: ['Azul, Vermelho', 'P, M, G, GG', 'Algodão, Poliéster'],
      color: 'green',
    },
    {
      number: 3,
      title: 'Gere as combinações',
      description: 'O sistema cria todas as variantes automaticamente',
      icon: Grid3X3,
      examples: ['Azul-P', 'Azul-M', 'Vermelho-P', 'Vermelho-M'],
      color: 'purple',
    },
    {
      number: 4,
      title: 'Gerencie na tabela',
      description: 'Edite preços, estoque e imagens de cada variante',
      icon: ListChecks,
      examples: ['Preço individual', 'Estoque por SKU', 'Imagens específicas'],
      color: 'orange',
    },
  ];

  const colorMap: Record<string, { bg: string; icon: string; border: string }> = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      icon: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800',
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      icon: 'text-green-600 dark:text-green-400',
      border: 'border-green-200 dark:border-green-800',
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      icon: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-200 dark:border-purple-800',
    },
    orange: {
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      icon: 'text-orange-600 dark:text-orange-400',
      border: 'border-orange-200 dark:border-orange-800',
    },
  };

  if (productType === 'SIMPLE') {
    return (
      <div className={cn(
        'p-8 text-center rounded-xl bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700',
        className
      )}>
        <Package className="w-16 h-16 mx-auto text-dark-300 mb-4" />
        <h3 className="text-lg font-semibold text-dark-700 dark:text-dark-300 mb-2">
          Produto Simples
        </h3>
        <p className="text-dark-500 max-w-md mx-auto">
          Produtos simples não possuem variações. Para adicionar variantes como
          cor e tamanho, altere o tipo do produto para "Configurável".
        </p>
      </div>
    );
  }

  if (hasAxesConfigured) {
    return (
      <div className={cn(
        'rounded-xl overflow-hidden',
        className
      )}>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-8">
          <div className="flex items-start gap-6">
            <div className="p-4 bg-green-100 dark:bg-green-900/40 rounded-2xl">
              <PlayCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  Eixos configurados
                </span>
              </div>

              <h3 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">
                Pronto para gerar variantes!
              </h3>

              <p className="text-dark-600 dark:text-dark-400 mb-6 max-w-xl">
                Seus eixos de variação estão configurados. Agora defina os valores
                para cada eixo e gere todas as combinações de uma só vez.
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={onGenerateVariants}
                  className="btn-primary flex items-center gap-2"
                >
                  <Grid3X3 className="w-5 h-5" />
                  Gerar Variantes
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={onStartConfiguration}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Settings2 className="w-4 h-4" />
                  Editar Eixos
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick tips */}
        <div className="p-4 bg-white dark:bg-dark-800 border-t border-green-200 dark:border-green-800">
          <div className="flex items-center gap-6 text-sm text-dark-600 dark:text-dark-400">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              <span>Use "Sugestões" para adicionar valores rapidamente</span>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-500" />
              <span>Recomendado: até 100 combinações</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'rounded-xl overflow-hidden',
      className
    )}>
      {/* Hero section */}
      <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-900/20 dark:via-blue-900/20 dark:to-indigo-900/20 p-8">
        <div className="flex items-start gap-6">
          <div className="p-4 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/40 dark:to-blue-900/40 rounded-2xl shadow-lg shadow-purple-500/10">
            <Layers className="w-12 h-12 text-purple-600 dark:text-purple-400" />
          </div>

          <div className="flex-1">
            <h3 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">
              Configure as variações do produto
            </h3>

            <p className="text-dark-600 dark:text-dark-400 mb-6 max-w-xl">
              Variantes permitem vender diferentes versões do mesmo produto, como
              uma camiseta em múltiplas cores e tamanhos. Cada combinação gera um
              SKU único com preço e estoque próprios.
            </p>

            <button
              onClick={onStartConfiguration}
              className="btn-primary flex items-center gap-2 shadow-lg shadow-primary-500/20"
            >
              <Sparkles className="w-5 h-5" />
              Começar Configuração
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="p-6 bg-white dark:bg-dark-800">
        <h4 className="text-sm font-semibold text-dark-500 uppercase tracking-wider mb-4">
          Como funciona
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step, idx) => {
            const colors = colorMap[step.color];
            const StepIcon = step.icon;

            return (
              <div
                key={idx}
                className={cn(
                  'p-4 rounded-xl border transition-all cursor-pointer',
                  activeStep === idx
                    ? `${colors.bg} ${colors.border}`
                    : 'bg-dark-50 dark:bg-dark-700/50 border-dark-200 dark:border-dark-700 hover:border-dark-300'
                )}
                onMouseEnter={() => setActiveStep(idx)}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold',
                    activeStep === idx
                      ? `${colors.bg} ${colors.icon}`
                      : 'bg-dark-200 dark:bg-dark-600 text-dark-500'
                  )}>
                    {step.number}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h5 className="font-semibold text-dark-800 dark:text-dark-200 text-sm mb-1">
                      {step.title}
                    </h5>
                    <p className="text-xs text-dark-500 mb-2">
                      {step.description}
                    </p>

                    <div className="flex flex-wrap gap-1">
                      {step.examples.slice(0, 3).map((ex, i) => (
                        <span
                          key={i}
                          className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded',
                            activeStep === idx
                              ? `${colors.bg} ${colors.icon}`
                              : 'bg-dark-100 dark:bg-dark-600 text-dark-500'
                          )}
                        >
                          {ex}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Examples */}
      <div className="p-6 bg-dark-50 dark:bg-dark-900 border-t border-dark-200 dark:border-dark-700">
        <h4 className="text-sm font-semibold text-dark-500 uppercase tracking-wider mb-4">
          Exemplos de uso
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white dark:bg-dark-800 rounded-lg border border-dark-200 dark:border-dark-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">👕</span>
              <span className="font-medium text-dark-700 dark:text-dark-300">Vestuário</span>
            </div>
            <p className="text-xs text-dark-500">
              Cor × Tamanho × Material = Combinações únicas por SKU
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-dark-800 rounded-lg border border-dark-200 dark:border-dark-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">📱</span>
              <span className="font-medium text-dark-700 dark:text-dark-300">Eletrônicos</span>
            </div>
            <p className="text-xs text-dark-500">
              Cor × Capacidade × Voltagem = SKUs distintos
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-dark-800 rounded-lg border border-dark-200 dark:border-dark-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🪑</span>
              <span className="font-medium text-dark-700 dark:text-dark-300">Móveis</span>
            </div>
            <p className="text-xs text-dark-500">
              Cor × Tamanho × Acabamento = Catálogo organizado
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
