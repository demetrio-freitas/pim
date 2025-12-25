'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Brain,
  Sparkles,
  FileText,
  Search,
  Globe,
  ShoppingBag,
  ShoppingCart,
  Wand2,
  Loader2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Copy,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface AIAssistantProps {
  productId?: string;
  productName: string;
  productSku?: string;
  brand?: string;
  category?: string;
  description?: string;
  shortDescription?: string;
  price?: number;
  attributes?: Record<string, string>;
  onApplyDescription?: (data: { shortDescription: string; description: string }) => void;
  onApplySEO?: (data: { metaTitle: string; metaDescription: string; urlKey: string }) => void;
  onApplyMarketplace?: (marketplace: string, data: any) => void;
  onApplyEnrichment?: (data: any) => void;
}

interface AIAction {
  code: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: string;
  color: string;
}

const aiActions: AIAction[] = [
  {
    code: 'generate_description',
    name: 'Gerar Descrição',
    description: 'Cria descrições curta e completa',
    icon: FileText,
    category: 'content',
    color: 'bg-blue-500',
  },
  {
    code: 'generate_seo',
    name: 'Otimizar SEO',
    description: 'Gera meta tags otimizadas',
    icon: Search,
    category: 'seo',
    color: 'bg-green-500',
  },
  {
    code: 'generate_ml',
    name: 'Mercado Livre',
    description: 'Adapta para o Mercado Livre',
    icon: ShoppingBag,
    category: 'marketplace',
    color: 'bg-yellow-500',
  },
  {
    code: 'generate_amazon',
    name: 'Amazon',
    description: 'Adapta para a Amazon',
    icon: ShoppingCart,
    category: 'marketplace',
    color: 'bg-orange-500',
  },
  {
    code: 'translate',
    name: 'Traduzir',
    description: 'Traduz para outros idiomas',
    icon: Globe,
    category: 'i18n',
    color: 'bg-purple-500',
  },
  {
    code: 'enrich',
    name: 'Enriquecer',
    description: 'Sugere categorias e atributos',
    icon: Sparkles,
    category: 'enrichment',
    color: 'bg-pink-500',
  },
];

export default function AIAssistant({
  productId,
  productName,
  productSku,
  brand,
  category,
  description,
  shortDescription,
  price,
  attributes,
  onApplyDescription,
  onApplySEO,
  onApplyMarketplace,
  onApplyEnrichment,
}: AIAssistantProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if AI is configured
  const { data: providers } = useQuery({
    queryKey: ['ai-providers-active'],
    queryFn: () => api.getActiveAIProviders(),
  });

  const hasActiveProvider = providers && providers.length > 0;

  const generateDescription = useMutation({
    mutationFn: () =>
      api.generateDescription({
        productId,
        productName,
        productSku,
        brand,
        category,
        attributes,
        tone: 'professional',
        length: 'medium',
        includeFeatures: true,
        includeBenefits: true,
      }),
    onSuccess: (data) => {
      if (data.success) {
        setResult({ type: 'description', data: data.data });
        setError(null);
      } else {
        setError(data.error || 'Erro ao gerar descrição');
      }
    },
    onError: (err: any) => setError(err.message),
  });

  const generateSEO = useMutation({
    mutationFn: () =>
      api.generateSEO({
        productId,
        productName,
        description,
        brand,
        category,
      }),
    onSuccess: (data) => {
      if (data.success) {
        setResult({ type: 'seo', data: data.data });
        setError(null);
      } else {
        setError(data.error || 'Erro ao gerar SEO');
      }
    },
    onError: (err: any) => setError(err.message),
  });

  const generateMarketplace = useMutation({
    mutationFn: (marketplace: string) =>
      api.generateMarketplaceContent({
        productId,
        productName,
        description,
        brand,
        category,
        price,
        marketplace,
      }),
    onSuccess: (data, marketplace) => {
      if (data.success) {
        setResult({ type: 'marketplace', marketplace, data: data.data });
        setError(null);
      } else {
        setError(data.error || 'Erro ao gerar conteúdo');
      }
    },
    onError: (err: any) => setError(err.message),
  });

  const enrichProduct = useMutation({
    mutationFn: () =>
      api.enrichProduct({
        productId,
        productName,
        description,
        brand,
        existingAttributes: attributes,
      }),
    onSuccess: (data) => {
      if (data.success) {
        setResult({ type: 'enrichment', data: data.data });
        setError(null);
      } else {
        setError(data.error || 'Erro ao enriquecer dados');
      }
    },
    onError: (err: any) => setError(err.message),
  });

  const handleAction = (code: string) => {
    setActiveAction(code);
    setResult(null);
    setError(null);

    switch (code) {
      case 'generate_description':
        generateDescription.mutate();
        break;
      case 'generate_seo':
        generateSEO.mutate();
        break;
      case 'generate_ml':
        generateMarketplace.mutate('mercadolivre');
        break;
      case 'generate_amazon':
        generateMarketplace.mutate('amazon');
        break;
      case 'enrich':
        enrichProduct.mutate();
        break;
      default:
        setActiveAction(null);
    }
  };

  const isLoading =
    generateDescription.isPending ||
    generateSEO.isPending ||
    generateMarketplace.isPending ||
    enrichProduct.isPending;

  const handleApply = () => {
    if (!result) return;

    switch (result.type) {
      case 'description':
        onApplyDescription?.({
          shortDescription: result.data.shortDescription,
          description: result.data.fullDescription,
        });
        break;
      case 'seo':
        onApplySEO?.({
          metaTitle: result.data.metaTitle,
          metaDescription: result.data.metaDescription,
          urlKey: result.data.urlKey,
        });
        break;
      case 'marketplace':
        onApplyMarketplace?.(result.marketplace, result.data);
        break;
      case 'enrichment':
        onApplyEnrichment?.(result.data);
        break;
    }
    setResult(null);
    setActiveAction(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!productName) {
    return null;
  }

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-dark-50 dark:hover:bg-dark-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-medium text-dark-900 dark:text-white">
              Assistente de IA
            </h3>
            <p className="text-sm text-dark-500 dark:text-dark-400">
              Gere conteúdo automaticamente com IA
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-dark-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-dark-400" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-dark-200 dark:border-dark-700 p-4 space-y-4">
          {!hasActiveProvider ? (
            <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  IA não configurada
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Configure um provedor de IA em Configurações &gt; Inteligência Artificial
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Actions Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {aiActions.map((action) => {
                  const Icon = action.icon;
                  const isActive = activeAction === action.code;
                  const isActionLoading = isLoading && isActive;

                  return (
                    <button
                      key={action.code}
                      onClick={() => handleAction(action.code)}
                      disabled={isLoading || action.code === 'translate'}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                        isActive
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-dark-200 dark:border-dark-700 hover:border-dark-300 dark:hover:border-dark-600',
                        action.code === 'translate' && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <div className={cn('p-2 rounded-lg', action.color)}>
                        {isActionLoading ? (
                          <Loader2 className="w-5 h-5 text-white animate-spin" />
                        ) : (
                          <Icon className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-dark-900 dark:text-white">
                          {action.name}
                        </p>
                        <p className="text-xs text-dark-500 dark:text-dark-400">
                          {action.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-400">
                  <X className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {/* Result */}
              {result && (
                <div className="space-y-4 p-4 bg-dark-50 dark:bg-dark-800/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-dark-900 dark:text-white">
                      Resultado Gerado
                    </h4>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAction(activeAction!)}
                        className="p-1.5 hover:bg-dark-200 dark:hover:bg-dark-700 rounded transition-colors"
                        title="Regenerar"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleApply}
                        className="btn-primary text-sm py-1.5"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Aplicar
                      </button>
                    </div>
                  </div>

                  {/* Description Result */}
                  {result.type === 'description' && result.data && (
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-sm font-medium text-dark-600 dark:text-dark-300">
                            Descrição Curta
                          </label>
                          <button
                            onClick={() => copyToClipboard(result.data.shortDescription)}
                            className="p-1 hover:bg-dark-200 dark:hover:bg-dark-700 rounded"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-sm text-dark-700 dark:text-dark-300 bg-white dark:bg-dark-900 p-2 rounded border border-dark-200 dark:border-dark-700">
                          {result.data.shortDescription}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-sm font-medium text-dark-600 dark:text-dark-300">
                            Descrição Completa
                          </label>
                          <button
                            onClick={() => copyToClipboard(result.data.fullDescription)}
                            className="p-1 hover:bg-dark-200 dark:hover:bg-dark-700 rounded"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-sm text-dark-700 dark:text-dark-300 bg-white dark:bg-dark-900 p-2 rounded border border-dark-200 dark:border-dark-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                          {result.data.fullDescription}
                        </p>
                      </div>

                      {result.data.bulletPoints?.length > 0 && (
                        <div>
                          <label className="text-sm font-medium text-dark-600 dark:text-dark-300 mb-1 block">
                            Bullet Points
                          </label>
                          <ul className="text-sm text-dark-700 dark:text-dark-300 bg-white dark:bg-dark-900 p-2 rounded border border-dark-200 dark:border-dark-700 space-y-1">
                            {result.data.bulletPoints.map((point: string, i: number) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-primary-500">•</span>
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SEO Result */}
                  {result.type === 'seo' && result.data && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label className="text-sm font-medium text-dark-600 dark:text-dark-300">
                            Meta Título ({result.data.metaTitle?.length || 0}/60)
                          </label>
                          <p className="text-sm text-dark-700 dark:text-dark-300 bg-white dark:bg-dark-900 p-2 rounded border border-dark-200 dark:border-dark-700 mt-1">
                            {result.data.metaTitle}
                          </p>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-dark-600 dark:text-dark-300">
                            Meta Descrição ({result.data.metaDescription?.length || 0}/160)
                          </label>
                          <p className="text-sm text-dark-700 dark:text-dark-300 bg-white dark:bg-dark-900 p-2 rounded border border-dark-200 dark:border-dark-700 mt-1">
                            {result.data.metaDescription}
                          </p>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-dark-600 dark:text-dark-300">
                            URL Amigável
                          </label>
                          <p className="text-sm text-dark-700 dark:text-dark-300 bg-white dark:bg-dark-900 p-2 rounded border border-dark-200 dark:border-dark-700 mt-1 font-mono">
                            /{result.data.urlKey}
                          </p>
                        </div>

                        {result.data.keywords?.length > 0 && (
                          <div>
                            <label className="text-sm font-medium text-dark-600 dark:text-dark-300">
                              Palavras-chave Sugeridas
                            </label>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {result.data.keywords.map((kw: string, i: number) => (
                                <span
                                  key={i}
                                  className="px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded text-xs"
                                >
                                  {kw}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Marketplace Result */}
                  {result.type === 'marketplace' && result.data && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-dark-600 dark:text-dark-300">
                          Título Otimizado
                        </label>
                        <p className="text-sm text-dark-700 dark:text-dark-300 bg-white dark:bg-dark-900 p-2 rounded border border-dark-200 dark:border-dark-700 mt-1">
                          {result.data.title}
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-dark-600 dark:text-dark-300">
                          Descrição
                        </label>
                        <p className="text-sm text-dark-700 dark:text-dark-300 bg-white dark:bg-dark-900 p-2 rounded border border-dark-200 dark:border-dark-700 mt-1 whitespace-pre-wrap max-h-40 overflow-y-auto">
                          {result.data.description}
                        </p>
                      </div>

                      {result.data.bulletPoints?.length > 0 && (
                        <div>
                          <label className="text-sm font-medium text-dark-600 dark:text-dark-300">
                            Bullet Points
                          </label>
                          <ul className="text-sm text-dark-700 dark:text-dark-300 bg-white dark:bg-dark-900 p-2 rounded border border-dark-200 dark:border-dark-700 mt-1 space-y-1">
                            {result.data.bulletPoints.map((point: string, i: number) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-primary-500">•</span>
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {result.data.searchTerms?.length > 0 && (
                        <div>
                          <label className="text-sm font-medium text-dark-600 dark:text-dark-300">
                            Termos de Busca
                          </label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {result.data.searchTerms.map((term: string, i: number) => (
                              <span
                                key={i}
                                className="px-2 py-1 bg-dark-200 dark:bg-dark-700 rounded text-xs"
                              >
                                {term}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Enrichment Result */}
                  {result.type === 'enrichment' && result.data && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <label className="text-sm font-medium text-dark-600 dark:text-dark-300">
                            Score de Qualidade
                          </label>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-2 bg-dark-200 dark:bg-dark-700 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all',
                                  result.data.qualityScore >= 80
                                    ? 'bg-green-500'
                                    : result.data.qualityScore >= 50
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                                )}
                                style={{ width: `${result.data.qualityScore}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">
                              {result.data.qualityScore}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {result.data.suggestedCategory && (
                        <div>
                          <label className="text-sm font-medium text-dark-600 dark:text-dark-300">
                            Categoria Sugerida
                          </label>
                          <p className="text-sm text-dark-700 dark:text-dark-300 mt-1">
                            {result.data.suggestedCategory}
                          </p>
                        </div>
                      )}

                      {Object.keys(result.data.extractedAttributes || {}).length > 0 && (
                        <div>
                          <label className="text-sm font-medium text-dark-600 dark:text-dark-300">
                            Atributos Extraídos
                          </label>
                          <div className="grid grid-cols-2 gap-2 mt-1">
                            {Object.entries(result.data.extractedAttributes).map(([key, value]) => (
                              <div
                                key={key}
                                className="flex justify-between p-2 bg-white dark:bg-dark-900 rounded border border-dark-200 dark:border-dark-700 text-sm"
                              >
                                <span className="text-dark-500">{key}:</span>
                                <span className="font-medium">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {result.data.suggestedTags?.length > 0 && (
                        <div>
                          <label className="text-sm font-medium text-dark-600 dark:text-dark-300">
                            Tags Sugeridas
                          </label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {result.data.suggestedTags.map((tag: string, i: number) => (
                              <span
                                key={i}
                                className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {result.data.suggestions?.length > 0 && (
                        <div>
                          <label className="text-sm font-medium text-dark-600 dark:text-dark-300">
                            Sugestões de Melhoria
                          </label>
                          <ul className="text-sm text-dark-700 dark:text-dark-300 mt-1 space-y-1">
                            {result.data.suggestions.map((suggestion: string, i: number) => (
                              <li key={i} className="flex items-start gap-2">
                                <Wand2 className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                                {suggestion}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
