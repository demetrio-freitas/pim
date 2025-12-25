'use client';

import { useState, useEffect } from 'react';
import { Sparkles, X, Loader2, CheckCircle, AlertCircle, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NCMSuggestion {
  code: string;
  description: string;
  confidence: number;
}

interface NCMSuggesterProps {
  productName: string;
  gtin?: string;
  currentValue?: string;
  onSelect: (ncm: string) => void;
  className?: string;
}

export function NCMSuggester({
  productName,
  gtin,
  currentValue,
  onSelect,
  className,
}: NCMSuggesterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<NCMSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [localProductName, setLocalProductName] = useState(productName);
  const [localGtin, setLocalGtin] = useState(gtin || '');
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  useEffect(() => {
    setLocalProductName(productName);
  }, [productName]);

  useEffect(() => {
    setLocalGtin(gtin || '');
  }, [gtin]);

  const canSearch = localProductName.trim().length > 0 || localGtin.trim().length > 0;

  const handleSearch = async () => {
    if (!canSearch) return;

    setIsLoading(true);
    setError(null);
    setSuggestions([]);
    setSelectedCode(null);

    try {
      const response = await fetch('/api/ai/suggest-ncm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: localProductName,
          gtin: localGtin,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar sugestões de NCM');
      }

      const data = await response.json();
      setSuggestions(data.suggestions || []);

      if (data.suggestions?.length === 0) {
        setError('Nenhum NCM encontrado para este produto. Tente refinar a descrição.');
      }
    } catch (err) {
      setError('Erro ao buscar sugestões. Tente novamente.');
      console.error('NCM suggestion error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (selectedCode) {
      onSelect(selectedCode);
      setIsOpen(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-50';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-orange-600 bg-orange-50';
  };

  return (
    <div className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors border border-primary-200"
      >
        <Sparkles className="w-4 h-4" />
        sugerir
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-200 dark:border-dark-700">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-primary-500" />
                <div>
                  <h2 className="text-lg font-semibold text-dark-900 dark:text-white">
                    Sugestão inteligente com Sugestor de NCM
                  </h2>
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
                  Sugestor de NCM com IA
                </span>
              </div>

              <p className="text-sm text-dark-600 dark:text-dark-400 mb-6">
                O Sugestor de NCM é um agente de IA que usa o nome e o GTIN do seu produto para identificar e sugerir o NCM ideal.
              </p>

              {/* Warning */}
              {!canSearch && (
                <div className="flex items-start gap-3 p-4 mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    A sugestão de NCM depende do nome ou GTIN do produto. Preencha um dos dois para continuar.
                  </p>
                </div>
              )}

              {/* Input Fields */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    Nome do produto
                  </label>
                  <input
                    type="text"
                    value={localProductName}
                    onChange={(e) => setLocalProductName(e.target.value)}
                    className="input w-full"
                    placeholder="Ex: Lâmpada LED 9W"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    Código de barras (GTIN)
                  </label>
                  <input
                    type="text"
                    value={localGtin}
                    onChange={(e) => setLocalGtin(e.target.value)}
                    className="input w-full"
                    placeholder="Ex: 7891234567890"
                  />
                </div>
              </div>

              {/* Search Button (when no results yet) */}
              {suggestions.length === 0 && !isLoading && (
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={!canSearch}
                  className="w-full btn-primary mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Buscar NCM
                </button>
              )}

              {/* Loading */}
              {isLoading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-3" />
                  <p className="text-sm text-dark-500">Buscando sugestões de NCM...</p>
                </div>
              )}

              {/* Error */}
              {error && !isLoading && (
                <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Results */}
              {suggestions.length > 0 && !isLoading && (
                <div className="border border-dark-200 dark:border-dark-700 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-dark-50 dark:bg-dark-900 border-b border-dark-200 dark:border-dark-700">
                    <p className="text-sm font-medium text-dark-700 dark:text-dark-300">
                      Encontramos {suggestions.length} NCM
                    </p>
                  </div>
                  <div className="divide-y divide-dark-200 dark:divide-dark-700 max-h-80 overflow-y-auto">
                    {suggestions.map((suggestion, index) => (
                      <label
                        key={index}
                        className={cn(
                          'flex items-start gap-3 p-4 cursor-pointer hover:bg-dark-50 dark:hover:bg-dark-900 transition-colors',
                          selectedCode === suggestion.code && 'bg-primary-50 dark:bg-primary-900/20'
                        )}
                      >
                        <input
                          type="radio"
                          name="ncm-selection"
                          value={suggestion.code}
                          checked={selectedCode === suggestion.code}
                          onChange={() => setSelectedCode(suggestion.code)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono font-medium text-dark-900 dark:text-white">
                              {suggestion.code}
                            </span>
                            <span className={cn(
                              'px-2 py-0.5 text-xs font-medium rounded-full flex items-center gap-1',
                              getConfidenceColor(suggestion.confidence)
                            )}>
                              <Sparkles className="w-3 h-3" />
                              {suggestion.confidence}%
                            </span>
                          </div>
                          <p className="text-sm text-dark-600 dark:text-dark-400 line-clamp-3">
                            {suggestion.description}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-dark-200 dark:border-dark-700 bg-dark-50 dark:bg-dark-900">
              {suggestions.length > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={handleSearch}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    Buscar novamente
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleApply}
                      disabled={!selectedCode}
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      aplicar sugestão
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="btn-secondary"
                    >
                      cancelar
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3 ml-auto">
                  <button
                    type="button"
                    onClick={handleSearch}
                    disabled={!canSearch || isLoading}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    salvar e sugerir ncm
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="btn-secondary"
                  >
                    cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
