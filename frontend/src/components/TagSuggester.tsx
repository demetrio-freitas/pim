'use client';

import { useState } from 'react';
import { Sparkles, X, Loader2, Plus, Tag, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagSuggestion {
  tag: string;
  relevance: number;
  category?: string;
}

interface TagSuggesterProps {
  productName: string;
  description?: string;
  category?: string;
  currentTags?: string;
  onApply: (tags: string) => void;
  className?: string;
}

const categoryLabels: Record<string, string> = {
  tipo: 'Tipo',
  material: 'Material',
  uso: 'Uso',
  caracteristica: 'Característica',
  publico: 'Público',
  ocasiao: 'Ocasião',
  estilo: 'Estilo',
};

const categoryColors: Record<string, string> = {
  tipo: 'bg-blue-100 text-blue-700',
  material: 'bg-amber-100 text-amber-700',
  uso: 'bg-green-100 text-green-700',
  caracteristica: 'bg-purple-100 text-purple-700',
  publico: 'bg-pink-100 text-pink-700',
  ocasiao: 'bg-orange-100 text-orange-700',
  estilo: 'bg-indigo-100 text-indigo-700',
};

export function TagSuggester({
  productName,
  description,
  category,
  currentTags,
  onApply,
  className,
}: TagSuggesterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const canSearch = productName.trim().length > 0;

  const handleSearch = async () => {
    if (!canSearch) return;

    setIsLoading(true);
    setError(null);
    setSuggestions([]);

    // Parse current tags and pre-select them
    const existingTags = new Set(
      (currentTags || '')
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(t => t.length > 0)
    );
    setSelectedTags(existingTags);

    try {
      const response = await fetch('/api/ai/suggest-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          description,
          category,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar sugestões de tags');
      }

      const data = await response.json();
      setSuggestions(data.tags || []);

      if (data.tags?.length === 0) {
        setError('Nenhuma tag encontrada. Tente refinar a descrição do produto.');
      }
    } catch (err) {
      setError('Erro ao buscar sugestões. Tente novamente.');
      console.error('Tag suggestion error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTag = (tag: string) => {
    const newSelected = new Set(selectedTags);
    if (newSelected.has(tag)) {
      newSelected.delete(tag);
    } else {
      newSelected.add(tag);
    }
    setSelectedTags(newSelected);
  };

  const handleApply = () => {
    const tagsString = Array.from(selectedTags).join(', ');
    onApply(tagsString);
    setIsOpen(false);
  };

  const selectAll = () => {
    const allTags = new Set(suggestions.map(s => s.tag));
    setSelectedTags(allTags);
  };

  const clearAll = () => {
    setSelectedTags(new Set());
  };

  return (
    <div className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          if (suggestions.length === 0) {
            handleSearch();
          }
        }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors border border-primary-200"
      >
        <Sparkles className="w-4 h-4" />
        sugerir tags
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-200 dark:border-dark-700">
              <div className="flex items-center gap-3">
                <Tag className="w-5 h-5 text-primary-500" />
                <div>
                  <h2 className="text-lg font-semibold text-dark-900 dark:text-white">
                    Sugestão de Tags com IA
                  </h2>
                  <p className="text-sm text-dark-500">
                    Tags sugeridas para melhorar a descoberta do produto
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
                  Sugestor de Tags com IA
                </span>
              </div>

              {/* Product Context */}
              <div className="p-3 mb-4 bg-dark-50 dark:bg-dark-900 rounded-lg">
                <p className="text-sm text-dark-600 dark:text-dark-400">
                  <span className="font-medium">Produto:</span> {productName}
                </p>
                {description && (
                  <p className="text-sm text-dark-500 mt-1 line-clamp-2">
                    {description}
                  </p>
                )}
              </div>

              {/* Loading */}
              {isLoading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-3" />
                  <p className="text-sm text-dark-500">Analisando produto e gerando tags...</p>
                </div>
              )}

              {/* Error */}
              {error && !isLoading && (
                <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Results */}
              {suggestions.length > 0 && !isLoading && (
                <div className="space-y-4">
                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-dark-600">
                      {selectedTags.size} de {suggestions.length} tags selecionadas
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAll}
                        className="text-xs text-primary-600 hover:text-primary-700"
                      >
                        Selecionar todas
                      </button>
                      <span className="text-dark-300">|</span>
                      <button
                        type="button"
                        onClick={clearAll}
                        className="text-xs text-dark-500 hover:text-dark-700"
                      >
                        Limpar seleção
                      </button>
                    </div>
                  </div>

                  {/* Tags Grid */}
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((suggestion, index) => {
                      const isSelected = selectedTags.has(suggestion.tag);
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => toggleTag(suggestion.tag)}
                          className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                            isSelected
                              ? 'bg-primary-500 text-white ring-2 ring-primary-300'
                              : 'bg-dark-100 dark:bg-dark-700 text-dark-700 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-600'
                          )}
                        >
                          {isSelected ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Plus className="w-3.5 h-3.5" />
                          )}
                          {suggestion.tag}
                          <span
                            className={cn(
                              'text-xs px-1.5 py-0.5 rounded-full ml-1',
                              isSelected
                                ? 'bg-white/20 text-white'
                                : categoryColors[suggestion.category || 'tipo'] || 'bg-gray-100 text-gray-600'
                            )}
                          >
                            {categoryLabels[suggestion.category || 'tipo'] || suggestion.category}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected Preview */}
                  {selectedTags.size > 0 && (
                    <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                      <p className="text-xs font-medium text-primary-700 dark:text-primary-400 mb-2">
                        Tags que serão aplicadas:
                      </p>
                      <p className="text-sm text-primary-600 dark:text-primary-300">
                        {Array.from(selectedTags).join(', ')}
                      </p>
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
                {suggestions.length > 0 ? 'Buscar novamente' : 'Buscar tags'}
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={selectedTags.size === 0}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Aplicar {selectedTags.size} tags
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
