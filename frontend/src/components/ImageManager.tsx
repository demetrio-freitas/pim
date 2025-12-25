'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  X,
  Upload,
  Link,
  Trash2,
  Download,
  Star,
  Loader2,
  Image as ImageIcon,
  GripVertical,
  ExternalLink,
} from 'lucide-react';

interface ProductMedia {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  type: string;
  alt?: string;
  title?: string;
  position: number;
  isMain: boolean;
  externalUrl?: string;
}

interface ImageManagerProps {
  productId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

type TabType = 'attached' | 'external';

export default function ImageManager({ productId, isOpen, onClose, onSave }: ImageManagerProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('attached');
  const [externalUrl, setExternalUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isAddingUrl, setIsAddingUrl] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch product media
  const { data: media = [], isLoading } = useQuery({
    queryKey: ['product-media', productId],
    queryFn: () => api.getProductMedia(productId),
    enabled: isOpen,
  });

  // Upload file mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.uploadProductMedia(productId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-media', productId] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      setError(null);
    },
    onError: (err: any) => {
      setError(err.message || 'Erro ao fazer upload da imagem');
    },
  });

  // Add from URL mutation (downloads the file)
  const addFromUrlMutation = useMutation({
    mutationFn: (url: string) => api.addProductMediaFromUrl(productId, url),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-media', productId] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      setExternalUrl('');
      setError(null);
    },
    onError: (err: any) => {
      setError(err.message || 'Erro ao baixar imagem da URL');
    },
  });

  // Add external URL mutation (just reference)
  const addExternalUrlMutation = useMutation({
    mutationFn: (url: string) => api.addProductExternalUrl(productId, url),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-media', productId] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      setExternalUrl('');
      setError(null);
    },
    onError: (err: any) => {
      setError(err.message || 'Erro ao adicionar URL externa');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (mediaId: string) => api.removeMediaFromProduct(productId, mediaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-media', productId] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
    },
  });

  // Set main image mutation
  const setMainMutation = useMutation({
    mutationFn: (mediaId: string) => api.setMainProductImage(productId, mediaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-media', productId] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
    },
  });

  // Handle file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      for (const file of Array.from(files)) {
        await uploadMutation.mutateAsync(file);
      }
    } finally {
      setIsUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  // Handle drag and drop
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      for (const file of Array.from(files)) {
        if (file.type.startsWith('image/')) {
          await uploadMutation.mutateAsync(file);
        }
      }
    } finally {
      setIsUploading(false);
    }
  }, [uploadMutation]);

  // Handle add from URL
  const handleAddFromUrl = async (download: boolean) => {
    if (!externalUrl.trim()) return;

    setIsAddingUrl(true);
    setError(null);

    try {
      if (download) {
        await addFromUrlMutation.mutateAsync(externalUrl);
      } else {
        await addExternalUrlMutation.mutateAsync(externalUrl);
      }
    } finally {
      setIsAddingUrl(false);
    }
  };

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  const attachedMedia = media.filter((m: ProductMedia) => !m.externalUrl || m.size > 0);
  const externalMedia = media.filter((m: ProductMedia) => m.externalUrl && m.size === 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-dark-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-200 dark:border-dark-700">
          <h2 className="text-lg font-semibold text-dark-900 dark:text-white">
            Gerenciar imagens
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-dark-100 dark:hover:bg-dark-800 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-dark-200 dark:border-dark-700">
          <button
            onClick={() => setActiveTab('attached')}
            className={cn(
              'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'attached'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-dark-500 hover:text-dark-700 dark:text-dark-400'
            )}
          >
            anexar imagens
            <span className="ml-2 text-xs bg-dark-100 dark:bg-dark-800 px-2 py-0.5 rounded-full">
              {attachedMedia.length.toString().padStart(2, '0')}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('external')}
            className={cn(
              'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'external'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-dark-500 hover:text-dark-700 dark:text-dark-400'
            )}
          >
            imagens externas
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          {activeTab === 'attached' && (
            <div className="space-y-4">
              {/* Upload area */}
              <div
                className="border-2 border-dashed border-dark-200 dark:border-dark-700 rounded-lg p-6 text-center"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <div className="flex items-center justify-center gap-4">
                  <label className="btn-primary cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    adicionar imagem
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>
                  <span className="text-dark-400">ou</span>
                  <button
                    onClick={() => setActiveTab('external')}
                    className="text-primary-500 hover:text-primary-600 font-medium"
                  >
                    adicionar via url
                  </button>
                  <span className="text-dark-400">
                    Experimente arrastar uma imagem
                  </span>
                </div>
                {isUploading && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-primary-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando...</span>
                  </div>
                )}
              </div>

              {/* Image list */}
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                </div>
              ) : attachedMedia.length > 0 ? (
                <div className="space-y-2">
                  {attachedMedia.map((item: ProductMedia) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 p-3 bg-dark-50 dark:bg-dark-800 rounded-lg"
                    >
                      <div className="cursor-move text-dark-400">
                        <GripVertical className="w-4 h-4" />
                      </div>

                      <div className="w-16 h-16 bg-white dark:bg-dark-700 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={item.url}
                          alt={item.alt || item.fileName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder-image.png';
                          }}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-dark-900 dark:text-white truncate">
                          {item.originalName || item.fileName}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {item.isMain && (
                            <span className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 px-2 py-0.5 rounded-full">
                              Principal
                            </span>
                          )}
                          <span className="text-xs text-dark-400">
                            anexo: {formatSize(item.size)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {!item.isMain && (
                          <button
                            onClick={() => setMainMutation.mutate(item.id)}
                            className="p-2 hover:bg-dark-200 dark:hover:bg-dark-700 rounded"
                            title="Definir como principal"
                          >
                            <Star className="w-4 h-4 text-dark-400" />
                          </button>
                        )}
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-dark-200 dark:hover:bg-dark-700 rounded"
                          title="Download"
                        >
                          <Download className="w-4 h-4 text-dark-400" />
                        </a>
                        <button
                          onClick={() => deleteMutation.mutate(item.id)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-dark-400">
                  <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma imagem anexada</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'external' && (
            <div className="space-y-4">
              {/* URL input */}
              <div className="space-y-4">
                <div>
                  <label className="label">Endereço do anexo (URL)</label>
                  <input
                    type="url"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://exemplo.com/imagem.jpg"
                    className="input"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAddFromUrl(true)}
                    disabled={!externalUrl.trim() || isAddingUrl}
                    className="btn-primary"
                  >
                    {isAddingUrl ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    anexar arquivo
                  </button>
                  <button
                    onClick={() => setExternalUrl('')}
                    className="btn-secondary"
                  >
                    cancelar <span className="text-xs ml-1 opacity-60">ESC</span>
                  </button>
                </div>
              </div>

              {/* External images list */}
              {externalMedia.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-dark-700 dark:text-dark-300 mb-3">
                    URLs externas
                  </h3>
                  <div className="space-y-2">
                    {externalMedia.map((item: ProductMedia) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-3 bg-dark-50 dark:bg-dark-800 rounded-lg"
                      >
                        <div className="w-12 h-12 bg-white dark:bg-dark-700 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={item.url}
                            alt={item.alt || 'External'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-dark-600 dark:text-dark-400 truncate">
                            {item.externalUrl || item.url}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <ExternalLink className="w-3 h-3 text-dark-400" />
                            <span className="text-xs text-dark-400">URL externa</span>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteMutation.mutate(item.id)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-dark-200 dark:border-dark-700 bg-dark-50 dark:bg-dark-800">
          <button onClick={onClose} className="btn-secondary">
            cancelar
          </button>
          <button
            onClick={() => {
              onSave?.();
              onClose();
            }}
            className="btn-primary"
          >
            salvar imagens
          </button>
        </div>
      </div>
    </div>
  );
}
