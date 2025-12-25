'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ImageIcon, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';

interface MediaItem {
  id: string;
  fileName: string;
  url: string | null;
  isMain: boolean;
}

interface ProductImageGalleryProps {
  media: MediaItem[];
  productName: string;
}

export default function ProductImageGallery({ media, productName }: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const mainIndex = media.findIndex(m => m.isMain);
    return mainIndex >= 0 ? mainIndex : 0;
  });
  const [isZoomed, setIsZoomed] = useState(false);

  const selectedImage = media[selectedIndex];

  const handlePrevious = () => {
    setSelectedIndex((prev) => (prev === 0 ? media.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev === media.length - 1 ? 0 : prev + 1));
  };

  if (!media || media.length === 0) {
    return (
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">
          Imagens do Produto
        </h2>
        <div className="aspect-video bg-dark-100 dark:bg-dark-800 rounded-lg flex flex-col items-center justify-center">
          <ImageIcon className="w-16 h-16 text-dark-300 dark:text-dark-600 mb-2" />
          <p className="text-dark-500 dark:text-dark-400">Nenhuma imagem disponível</p>
          <p className="text-sm text-dark-400 dark:text-dark-500 mt-1">
            Adicione imagens no modo de edição
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">
        Imagens do Produto
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Thumbnails laterais (desktop) / abaixo (mobile) */}
        <div className="order-2 md:order-1 md:col-span-1">
          <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto md:max-h-[400px] pb-2 md:pb-0 md:pr-2">
            {media.map((item, index) => (
              <button
                key={item.id}
                onClick={() => setSelectedIndex(index)}
                className={cn(
                  'flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all',
                  index === selectedIndex
                    ? 'border-primary-500 ring-2 ring-primary-500/30'
                    : 'border-dark-200 dark:border-dark-700 hover:border-primary-400'
                )}
              >
                {item.url ? (
                  <img
                    src={item.url}
                    alt={`${productName} - ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-dark-100 dark:bg-dark-800 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-dark-400" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Imagem principal */}
        <div className="order-1 md:order-2 md:col-span-3 relative">
          <div
            className="aspect-square md:aspect-[4/3] bg-dark-100 dark:bg-dark-800 rounded-lg overflow-hidden relative group cursor-pointer"
            onClick={() => setIsZoomed(true)}
          >
            {selectedImage?.url ? (
              <>
                <img
                  src={selectedImage.url}
                  alt={productName}
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-16 h-16 text-dark-400" />
              </div>
            )}

            {/* Navigation arrows */}
            {media.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); handlePrevious(); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 dark:bg-dark-800/80 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white dark:hover:bg-dark-700"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleNext(); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 dark:bg-dark-800/80 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white dark:hover:bg-dark-700"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Image counter */}
          {media.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/60 rounded-full text-white text-sm">
              {selectedIndex + 1} / {media.length}
            </div>
          )}
        </div>
      </div>

      {/* Zoom modal */}
      {isZoomed && selectedImage?.url && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setIsZoomed(false)}
        >
          <button
            onClick={() => setIsZoomed(false)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white"
          >
            <span className="sr-only">Fechar</span>
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={selectedImage.url}
            alt={productName}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Navigation in zoom mode */}
          {media.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); handlePrevious(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
