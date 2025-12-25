'use client';

import { useState } from 'react';
import { Sparkles, Loader2, Copy, Check, RefreshCw, Wand2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToneType = 'professional' | 'casual' | 'technical';
type LengthType = 'short' | 'medium' | 'long';

interface AIDescriptionGeneratorProps {
  productName: string;
  productSpecs?: string;
  brand?: string;
  category?: string;
  onGenerated: (description: string) => void;
  className?: string;
}

const toneOptions: { value: ToneType; label: string; description: string }[] = [
  { value: 'professional', label: 'Profissional', description: 'Tom confiável e corporativo' },
  { value: 'casual', label: 'Casual', description: 'Amigável e conversacional' },
  { value: 'technical', label: 'Técnico', description: 'Detalhado e especializado' },
];

const lengthOptions: { value: LengthType; label: string; description: string }[] = [
  { value: 'short', label: 'Curta', description: '2-3 frases' },
  { value: 'medium', label: 'Média', description: '1 parágrafo' },
  { value: 'long', label: 'Longa', description: '2-3 parágrafos' },
];

export function AIDescriptionGenerator({
  productName,
  productSpecs,
  brand,
  category,
  onGenerated,
  className,
}: AIDescriptionGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tone, setTone] = useState<ToneType>('professional');
  const [length, setLength] = useState<LengthType>('medium');
  const [showOptions, setShowOptions] = useState(false);

  const generate = async () => {
    if (!productName.trim()) {
      setError('Preencha o nome do produto primeiro');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          productSpecs,
          brand,
          category,
          tone,
          length,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao gerar descrição');
      }

      const data = await response.json();
      setGenerated(data.description);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar descrição');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUse = () => {
    onGenerated(generated);
    setGenerated('');
  };

  return (
    <div className={cn('border border-purple-200 dark:border-purple-800 rounded-lg overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20', className)}>
      {/* Header */}
      <div className="p-4 border-b border-purple-200 dark:border-purple-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h4 className="font-semibold text-purple-900 dark:text-purple-100">
              Gerar com IA
            </h4>
            <span className="text-xs bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
              Claude AI
            </span>
          </div>

          <button
            onClick={() => setShowOptions(!showOptions)}
            className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
          >
            {showOptions ? 'Ocultar opções' : 'Opções avançadas'}
          </button>
        </div>

        {/* Options */}
        {showOptions && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-purple-700 dark:text-purple-300 mb-2">
                Tom
              </label>
              <div className="space-y-1">
                {toneOptions.map((option) => (
                  <label
                    key={option.value}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded cursor-pointer transition-colors',
                      tone === option.value
                        ? 'bg-purple-200 dark:bg-purple-800'
                        : 'hover:bg-purple-100 dark:hover:bg-purple-800/50'
                    )}
                  >
                    <input
                      type="radio"
                      name="tone"
                      value={option.value}
                      checked={tone === option.value}
                      onChange={(e) => setTone(e.target.value as ToneType)}
                      className="text-purple-600"
                    />
                    <div>
                      <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
                        {option.label}
                      </span>
                      <p className="text-xs text-purple-600 dark:text-purple-400">
                        {option.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-purple-700 dark:text-purple-300 mb-2">
                Tamanho
              </label>
              <div className="space-y-1">
                {lengthOptions.map((option) => (
                  <label
                    key={option.value}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded cursor-pointer transition-colors',
                      length === option.value
                        ? 'bg-purple-200 dark:bg-purple-800'
                        : 'hover:bg-purple-100 dark:hover:bg-purple-800/50'
                    )}
                  >
                    <input
                      type="radio"
                      name="length"
                      value={option.value}
                      checked={length === option.value}
                      onChange={(e) => setLength(e.target.value as LengthType)}
                      className="text-purple-600"
                    />
                    <div>
                      <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
                        {option.label}
                      </span>
                      <p className="text-xs text-purple-600 dark:text-purple-400">
                        {option.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Generate Button */}
        {!generated && (
          <div className="text-center">
            {!productName.trim() ? (
              <p className="text-sm text-purple-600 dark:text-purple-400 mb-4">
                Preencha o nome do produto primeiro para gerar a descrição
              </p>
            ) : (
              <p className="text-sm text-purple-600 dark:text-purple-400 mb-4">
                Clique para gerar uma descrição otimizada para SEO baseada no nome do produto
              </p>
            )}

            <button
              onClick={generate}
              disabled={generating || !productName.trim()}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto transition-colors"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Gerando descrição...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  Gerar Descrição
                </>
              )}
            </button>
          </div>
        )}

        {/* Generated Content */}
        {generated && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-dark-800 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
              <p className="text-sm text-dark-800 dark:text-dark-200 whitespace-pre-wrap leading-relaxed">
                {generated}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleUse}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Check className="w-4 h-4" />
                Usar esta Descrição
              </button>

              <button
                onClick={handleCopy}
                className="px-4 py-2 border border-purple-300 dark:border-purple-700 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/30 flex items-center gap-2 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-green-600">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-purple-600 dark:text-purple-400">Copiar</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setGenerated('');
                  generate();
                }}
                className="px-4 py-2 border border-purple-300 dark:border-purple-700 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
                title="Gerar outra versão"
              >
                <RefreshCw className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
