'use client';

import { useState, useCallback } from 'react';
import {
  Link,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Plus,
  Image as ImageIcon,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UrlImage {
  id: string;
  url: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  error?: string;
  previewUrl?: string;
  blob?: Blob;
  fileName?: string;
}

interface ImageUrlUploaderProps {
  onImagesReady: (images: { blob: Blob; fileName: string; originalUrl: string }[]) => void;
  existingImages?: string[];
  maxImages?: number;
  className?: string;
}

export function ImageUrlUploader({
  onImagesReady,
  existingImages = [],
  maxImages = 10,
  className,
}: ImageUrlUploaderProps) {
  const [urls, setUrls] = useState<UrlImage[]>([]);
  const [inputUrl, setInputUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  };

  const isImageUrl = (url: string): boolean => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    const lowerUrl = url.toLowerCase().split('?')[0];
    return imageExtensions.some(ext => lowerUrl.endsWith(ext));
  };

  const extractFileName = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const fileName = pathname.split('/').pop() || 'image';
      // Ensure it has an extension
      if (!fileName.includes('.')) {
        return `${fileName}.jpg`;
      }
      return fileName;
    } catch {
      return `image-${Date.now()}.jpg`;
    }
  };

  const fetchImageAsBlob = async (url: string): Promise<{ blob: Blob; contentType: string }> => {
    // Use a proxy to avoid CORS issues
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;

    try {
      // First try with proxy
      const response = await fetch(proxyUrl);
      if (response.ok) {
        const blob = await response.blob();
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        return { blob, contentType };
      }
    } catch {
      // Proxy failed, try direct fetch
    }

    // Try direct fetch (may fail due to CORS)
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
    });

    if (!response.ok) {
      throw new Error(`Falha ao buscar imagem: ${response.status}`);
    }

    const blob = await response.blob();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    if (!contentType.startsWith('image/')) {
      throw new Error('URL não retornou uma imagem válida');
    }

    return { blob, contentType };
  };

  const processUrl = async (urlImage: UrlImage): Promise<UrlImage> => {
    try {
      const { blob } = await fetchImageAsBlob(urlImage.url);
      const previewUrl = URL.createObjectURL(blob);
      const fileName = extractFileName(urlImage.url);

      return {
        ...urlImage,
        status: 'success',
        previewUrl,
        blob,
        fileName,
      };
    } catch (error) {
      return {
        ...urlImage,
        status: 'error',
        error: error instanceof Error ? error.message : 'Erro ao processar URL',
      };
    }
  };

  const addUrl = async () => {
    const trimmedUrl = inputUrl.trim();

    if (!trimmedUrl) return;

    if (!isValidUrl(trimmedUrl)) {
      return; // Could add validation error display
    }

    if (urls.length + existingImages.length >= maxImages) {
      return; // Max images reached
    }

    // Check for duplicates
    if (urls.some(u => u.url === trimmedUrl)) {
      setInputUrl('');
      return;
    }

    const newUrlImage: UrlImage = {
      id: generateId(),
      url: trimmedUrl,
      status: 'loading',
    };

    setUrls(prev => [...prev, newUrlImage]);
    setInputUrl('');

    // Process the URL
    const processed = await processUrl(newUrlImage);
    setUrls(prev => prev.map(u => u.id === processed.id ? processed : u));

    // Notify parent of ready images
    if (processed.status === 'success' && processed.blob && processed.fileName) {
      const allSuccessful = [...urls.filter(u => u.status === 'success' && u.blob), processed];
      const readyImages = allSuccessful
        .filter((u): u is UrlImage & { blob: Blob; fileName: string } =>
          u.status === 'success' && !!u.blob && !!u.fileName
        )
        .map(u => ({
          blob: u.blob,
          fileName: u.fileName,
          originalUrl: u.url,
        }));
      onImagesReady(readyImages);
    }
  };

  const addMultipleUrls = async (urlList: string[]) => {
    setIsProcessing(true);

    const validUrls = urlList
      .map(u => u.trim())
      .filter(u => isValidUrl(u) && !urls.some(existing => existing.url === u));

    const newUrlImages: UrlImage[] = validUrls.map(url => ({
      id: generateId(),
      url,
      status: 'loading' as const,
    }));

    setUrls(prev => [...prev, ...newUrlImages]);

    // Process all URLs in parallel
    const processed = await Promise.all(newUrlImages.map(processUrl));

    setUrls(prev => prev.map(u => {
      const found = processed.find(p => p.id === u.id);
      return found || u;
    }));

    // Notify parent
    const allSuccessful = processed.filter(
      (u): u is UrlImage & { blob: Blob; fileName: string } =>
        u.status === 'success' && !!u.blob && !!u.fileName
    );

    if (allSuccessful.length > 0) {
      const readyImages = allSuccessful.map(u => ({
        blob: u.blob,
        fileName: u.fileName,
        originalUrl: u.url,
      }));
      onImagesReady(readyImages);
    }

    setIsProcessing(false);
  };

  const removeUrl = (id: string) => {
    const urlToRemove = urls.find(u => u.id === id);
    if (urlToRemove?.previewUrl) {
      URL.revokeObjectURL(urlToRemove.previewUrl);
    }
    setUrls(prev => prev.filter(u => u.id !== id));

    // Update parent with remaining images
    const remaining = urls
      .filter(u => u.id !== id && u.status === 'success' && u.blob && u.fileName)
      .map(u => ({
        blob: u.blob!,
        fileName: u.fileName!,
        originalUrl: u.url,
      }));
    onImagesReady(remaining);
  };

  const retryUrl = async (id: string) => {
    const urlImage = urls.find(u => u.id === id);
    if (!urlImage) return;

    setUrls(prev => prev.map(u => u.id === id ? { ...u, status: 'loading', error: undefined } : u));

    const processed = await processUrl({ ...urlImage, status: 'loading' });
    setUrls(prev => prev.map(u => u.id === processed.id ? processed : u));

    if (processed.status === 'success' && processed.blob && processed.fileName) {
      const allSuccessful = urls
        .filter(u => (u.id === processed.id ? false : u.status === 'success' && u.blob && u.fileName))
        .concat(processed)
        .filter((u): u is UrlImage & { blob: Blob; fileName: string } =>
          u.status === 'success' && !!u.blob && !!u.fileName
        )
        .map(u => ({
          blob: u.blob,
          fileName: u.fileName,
          originalUrl: u.url,
        }));
      onImagesReady(allSuccessful);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text');
    const lines = pastedText.split('\n').filter(line => line.trim());

    if (lines.length > 1) {
      e.preventDefault();
      addMultipleUrls(lines);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addUrl();
    }
  };

  const successCount = urls.filter(u => u.status === 'success').length;
  const errorCount = urls.filter(u => u.status === 'error').length;
  const loadingCount = urls.filter(u => u.status === 'loading').length;

  return (
    <div className={cn('space-y-4', className)}>
      {/* URL Input */}
      <div className="space-y-2">
        <label className="label flex items-center gap-2">
          <Link className="w-4 h-4" />
          Adicionar Imagem por URL
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            placeholder="https://exemplo.com/imagem.jpg"
            className="input flex-1"
            disabled={isProcessing}
          />
          <button
            type="button"
            onClick={addUrl}
            disabled={!inputUrl.trim() || isProcessing || urls.length >= maxImages}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-dark-500">
          Cole uma URL de imagem ou várias URLs (uma por linha) para adicionar em lote
        </p>
      </div>

      {/* Status Summary */}
      {urls.length > 0 && (
        <div className="flex items-center gap-4 text-sm">
          {successCount > 0 && (
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <CheckCircle className="w-4 h-4" />
              {successCount} pronta(s)
            </span>
          )}
          {loadingCount > 0 && (
            <span className="flex items-center gap-1 text-primary-600 dark:text-primary-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              {loadingCount} processando
            </span>
          )}
          {errorCount > 0 && (
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4" />
              {errorCount} com erro
            </span>
          )}
        </div>
      )}

      {/* URL List */}
      {urls.length > 0 && (
        <div className="space-y-2">
          {urls.map((urlImage) => (
            <div
              key={urlImage.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                urlImage.status === 'success' && 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
                urlImage.status === 'loading' && 'bg-dark-50 dark:bg-dark-800 border-dark-200 dark:border-dark-700',
                urlImage.status === 'error' && 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              )}
            >
              {/* Preview or Icon */}
              <div className="w-12 h-12 flex-shrink-0 rounded bg-white dark:bg-dark-700 overflow-hidden flex items-center justify-center">
                {urlImage.status === 'loading' ? (
                  <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
                ) : urlImage.previewUrl ? (
                  <img
                    src={urlImage.previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="w-5 h-5 text-dark-400" />
                )}
              </div>

              {/* URL Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-dark-700 dark:text-dark-300 truncate">
                  {urlImage.url}
                </p>
                {urlImage.error && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                    {urlImage.error}
                  </p>
                )}
                {urlImage.status === 'success' && urlImage.fileName && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                    {urlImage.fileName}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {urlImage.status === 'error' && (
                  <button
                    type="button"
                    onClick={() => retryUrl(urlImage.id)}
                    className="p-1.5 hover:bg-dark-100 dark:hover:bg-dark-700 rounded text-dark-500"
                    title="Tentar novamente"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeUrl(urlImage.id)}
                  className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500"
                  title="Remover"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {urls.length === 0 && (
        <div className="text-center py-6 border-2 border-dashed border-dark-200 dark:border-dark-700 rounded-lg">
          <ExternalLink className="w-8 h-8 text-dark-400 mx-auto mb-2" />
          <p className="text-sm text-dark-500">
            Adicione URLs de imagens para importar
          </p>
          <p className="text-xs text-dark-400 mt-1">
            Suporta JPG, PNG, WebP, GIF
          </p>
        </div>
      )}
    </div>
  );
}
