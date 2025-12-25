'use client';

import { useState } from 'react';
import { Sparkles, X, Loader2, Check, Search, Lightbulb, Copy, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SEOSuggestion {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  urlKey: string;
  tips: string[];
}

interface SEOOptimizerProps {
  productName: string;
  description?: string;
  category?: string;
  brand?: string;
  currentSeo?: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
    urlKey?: string;
  };
  onApply: (seo: {
    metaTitle: string;
    metaDescription: string;
    metaKeywords: string;
    urlKey: string;
  }) => void;
  className?: string;
}

export function SEOOptimizer({
  productName,
  description,
  category,
  brand,
  currentSeo,
  onApply,
  className,
}: SEOOptimizerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<SEOSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFields, setSelectedFields] = useState({
    metaTitle: true,
    metaDescription: true,
    metaKeywords: true,
    urlKey: true,
  });
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const canSearch = productName.trim().length > 0;

  const handleSearch = async () => {
    if (!canSearch) return;

    setIsLoading(true);
    setError(null);
    setSuggestion(null);

    try {
      const response = await fetch('/api/ai/optimize-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          description,
          category,
          brand,
          currentSeo,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao otimizar SEO');
      }

      const data = await response.json();
      setSuggestion(data);
    } catch (err) {
      setError('Erro ao gerar otimização SEO. Tente novamente.');
      console.error('SEO optimization error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleField = (field: keyof typeof selectedFields) => {
    setSelectedFields(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleApply = () => {
    if (!suggestion) return;

    onApply({
      metaTitle: selectedFields.metaTitle ? suggestion.metaTitle : (currentSeo?.metaTitle || ''),
      metaDescription: selectedFields.metaDescription ? suggestion.metaDescription : (currentSeo?.metaDescription || ''),
      metaKeywords: selectedFields.metaKeywords ? suggestion.metaKeywords : (currentSeo?.metaKeywords || ''),
      urlKey: selectedFields.urlKey ? suggestion.urlKey : (currentSeo?.urlKey || ''),
    });
    setIsOpen(false);
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getCharCount = (text: string, max: number) => {
    const count = text.length;
    const isOver = count > max;
    return (
      <span className={cn('text-xs', isOver ? 'text-red-500' : 'text-dark-400')}>
        {count}/{max}
      </span>
    );
  };

  return (
    <div className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          if (!suggestion) {
            handleSearch();
          }
        }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors border border-primary-200"
      >
        <Sparkles className="w-4 h-4" />
        otimizar SEO
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-200 dark:border-dark-700">
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5 text-primary-500" />
                <div>
                  <h2 className="text-lg font-semibold text-dark-900 dark:text-white">
                    Otimização SEO com IA
                  </h2>
                  <p className="text-sm text-dark-500">
                    Meta tags otimizadas para melhor ranking nos buscadores
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 text-dark-500 hover:text-dark-700 hover:bg-dark-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Beta Badge */}
              <div className="flex items-center gap-2 mb-4">
                <span className="px-2 py-0.5 text-xs font-medium bg-dark-900 text-white rounded">
                  beta
                </span>
                <span className="text-sm text-dark-500">
                  Otimizador SEO com IA
                </span>
              </div>

              {/* Loading */}
              {isLoading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-3" />
                  <p className="text-sm text-dark-500">Analisando produto e gerando SEO otimizado...</p>
                </div>
              )}

              {/* Error */}
              {error && !isLoading && (
                <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Results */}
              {suggestion && !isLoading && (
                <div className="space-y-6">
                  {/* Meta Title */}
                  <div className="border border-dark-200 dark:border-dark-700 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-dark-50 dark:bg-dark-900">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedFields.metaTitle}
                          onChange={() => toggleField('metaTitle')}
                          className="rounded"
                        />
                        <span className="font-medium text-dark-700 dark:text-dark-300">Meta Title</span>
                        {getCharCount(suggestion.metaTitle, 60)}
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(suggestion.metaTitle, 'metaTitle')}
                        className="p-1.5 text-dark-400 hover:text-dark-600 rounded"
                      >
                        {copiedField === 'metaTitle' ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <div className="p-4">
                      <p className="text-dark-900 dark:text-white">{suggestion.metaTitle}</p>
                      {currentSeo?.metaTitle && (
                        <p className="text-xs text-dark-400 mt-2">
                          <span className="font-medium">Atual:</span> {currentSeo.metaTitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Meta Description */}
                  <div className="border border-dark-200 dark:border-dark-700 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-dark-50 dark:bg-dark-900">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedFields.metaDescription}
                          onChange={() => toggleField('metaDescription')}
                          className="rounded"
                        />
                        <span className="font-medium text-dark-700 dark:text-dark-300">Meta Description</span>
                        {getCharCount(suggestion.metaDescription, 160)}
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(suggestion.metaDescription, 'metaDescription')}
                        className="p-1.5 text-dark-400 hover:text-dark-600 rounded"
                      >
                        {copiedField === 'metaDescription' ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <div className="p-4">
                      <p className="text-dark-900 dark:text-white">{suggestion.metaDescription}</p>
                      {currentSeo?.metaDescription && (
                        <p className="text-xs text-dark-400 mt-2">
                          <span className="font-medium">Atual:</span> {currentSeo.metaDescription}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Meta Keywords */}
                  <div className="border border-dark-200 dark:border-dark-700 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-dark-50 dark:bg-dark-900">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedFields.metaKeywords}
                          onChange={() => toggleField('metaKeywords')}
                          className="rounded"
                        />
                        <span className="font-medium text-dark-700 dark:text-dark-300">Meta Keywords</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(suggestion.metaKeywords, 'metaKeywords')}
                        className="p-1.5 text-dark-400 hover:text-dark-600 rounded"
                      >
                        {copiedField === 'metaKeywords' ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <div className="p-4">
                      <div className="flex flex-wrap gap-2">
                        {suggestion.metaKeywords.split(',').map((keyword, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-dark-100 dark:bg-dark-700 text-dark-700 dark:text-dark-300 rounded text-sm"
                          >
                            {keyword.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* URL Key */}
                  <div className="border border-dark-200 dark:border-dark-700 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-dark-50 dark:bg-dark-900">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedFields.urlKey}
                          onChange={() => toggleField('urlKey')}
                          className="rounded"
                        />
                        <span className="font-medium text-dark-700 dark:text-dark-300">URL Amigável</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(suggestion.urlKey, 'urlKey')}
                        className="p-1.5 text-dark-400 hover:text-dark-600 rounded"
                      >
                        {copiedField === 'urlKey' ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <div className="p-4">
                      <code className="text-primary-600 dark:text-primary-400">/{suggestion.urlKey}</code>
                      {currentSeo?.urlKey && (
                        <p className="text-xs text-dark-400 mt-2">
                          <span className="font-medium">Atual:</span> /{currentSeo.urlKey}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Tips */}
                  {suggestion.tips && suggestion.tips.length > 0 && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <Lightbulb className="w-5 h-5 text-amber-600" />
                        <span className="font-medium text-amber-800 dark:text-amber-300">Dicas de SEO</span>
                      </div>
                      <ul className="space-y-2">
                        {suggestion.tips.map((tip, i) => (
                          <li key={i} className="text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
                            <span className="text-amber-500">•</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-dark-200 dark:border-dark-700 bg-dark-50 dark:bg-dark-900">
              <button
                type="button"
                onClick={handleSearch}
                disabled={isLoading}
                className="text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
              >
                {suggestion ? 'Gerar novamente' : 'Gerar SEO'}
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={!suggestion || !Object.values(selectedFields).some(v => v)}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Aplicar selecionados
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
