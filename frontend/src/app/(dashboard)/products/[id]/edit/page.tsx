'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Save,
  Loader2,
  Upload,
  Image as ImageIcon,
  X,
  Star,
  GripVertical,
  Plus,
  Trash2,
  ImagePlus,
} from 'lucide-react';
import AIAssistant from '@/components/AIAssistant';
import ImageManager from '@/components/ImageManager';
import { VariantManager } from '@/components/VariantManager';
import { BundleManager } from '@/components/BundleManager';
import { GroupedProductManager } from '@/components/GroupedProductManager';
import { VirtualProductManager, defaultVirtualProductData } from '@/components/VirtualProductManager';
import { BundleComponent, GroupedProductItem, VirtualProductData } from '@/types';

interface ProductMedia {
  id: string;
  url: string;
  originalName: string;
  isMain: boolean;
  position: number;
}

const productTypes = [
  { value: 'SIMPLE', label: 'Simples' },
  { value: 'CONFIGURABLE', label: 'Configurável (Variações)' },
  { value: 'BUNDLE', label: 'Bundle (Kit)' },
  { value: 'GROUPED', label: 'Agrupado' },
  { value: 'VIRTUAL', label: 'Virtual' },
];

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    shortDescription: '',
    price: '',
    costPrice: '',
    brand: '',
    manufacturer: '',
    weight: '',
    metaTitle: '',
    metaDescription: '',
    metaKeywords: '',
    urlKey: '',
    stockQuantity: '',
    isInStock: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isImageManagerOpen, setIsImageManagerOpen] = useState(false);
  const [bundleComponents, setBundleComponents] = useState<BundleComponent[]>([]);
  const [groupedItems, setGroupedItems] = useState<GroupedProductItem[]>([]);
  const [virtualData, setVirtualData] = useState<VirtualProductData>(defaultVirtualProductData);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', params.id],
    queryFn: () => api.getProduct(params.id as string),
  });

  // Fetch bundle components if product is a bundle
  const { data: bundleData } = useQuery({
    queryKey: ['bundle-components', params.id],
    queryFn: () => api.getBundleComponents(params.id as string),
    enabled: !!product && product.type === 'BUNDLE',
  });

  // Update bundle components when data is fetched
  useEffect(() => {
    if (bundleData) {
      setBundleComponents(bundleData);
    }
  }, [bundleData]);

  // Fetch grouped items if product is a grouped product
  const { data: groupedData } = useQuery({
    queryKey: ['grouped-items', params.id],
    queryFn: () => api.getGroupedItems(params.id as string),
    enabled: !!product && product.type === 'GROUPED',
  });

  // Update grouped items when data is fetched
  useEffect(() => {
    if (groupedData) {
      setGroupedItems(groupedData);
    }
  }, [groupedData]);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        shortDescription: product.shortDescription || '',
        price: product.price?.toString() || '',
        costPrice: product.costPrice?.toString() || '',
        brand: product.brand || '',
        manufacturer: product.manufacturer || '',
        weight: product.weight?.toString() || '',
        metaTitle: product.metaTitle || '',
        metaDescription: product.metaDescription || '',
        metaKeywords: product.metaKeywords || '',
        urlKey: product.urlKey || '',
        stockQuantity: product.stockQuantity?.toString() || '0',
        isInStock: product.isInStock ?? true,
      });
    }
  }, [product]);

  const mutation = useMutation({
    mutationFn: (data: typeof formData) =>
      api.updateProduct(params.id as string, {
        ...data,
        price: data.price ? parseFloat(data.price) : null,
        costPrice: data.costPrice ? parseFloat(data.costPrice) : null,
        weight: data.weight ? parseFloat(data.weight) : null,
        stockQuantity: data.stockQuantity ? parseInt(data.stockQuantity) : 0,
        isInStock: data.isInStock,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', params.id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      router.push(`/products/${params.id}`);
    },
    onError: (error: any) => {
      if (error.errors) {
        setErrors(error.errors);
      }
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      setUploading(true);
      const results = [];
      for (const file of files) {
        const result = await api.uploadProductMedia(params.id as string, file);
        results.push(result);
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', params.id] });
      setUploading(false);
    },
    onError: () => {
      setUploading(false);
    },
  });

  const setMainImageMutation = useMutation({
    mutationFn: (mediaId: string) => api.setMainProductImage(params.id as string, mediaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', params.id] });
    },
  });

  const removeMediaMutation = useMutation({
    mutationFn: (mediaId: string) => api.removeMediaFromProduct(params.id as string, mediaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', params.id] });
    },
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    mutation.mutate(formData);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter(file =>
        file.type.startsWith('image/')
      );
      if (files.length > 0) {
        uploadMutation.mutate(files);
      }
    }
  }, [uploadMutation]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      uploadMutation.mutate(files);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-dark-500 dark:text-dark-400">Produto não encontrado</p>
        <Link href="/products" className="btn-primary mt-4 inline-block">
          Voltar para Produtos
        </Link>
      </div>
    );
  }

  const productMedia: ProductMedia[] = product.media || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/products/${params.id}`}
          className="p-2 hover:bg-dark-100 dark:hover:bg-dark-800 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white">
            Editar Produto
          </h1>
          <p className="text-dark-500 dark:text-dark-400 mt-1 font-mono">
            SKU: {product.sku}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Imagens do Produto */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-dark-900 dark:text-white">
              Imagens do Produto
            </h2>
            <button
              type="button"
              onClick={() => setIsImageManagerOpen(true)}
              className="btn-primary"
            >
              <ImagePlus className="w-4 h-4 mr-2" />
              Gerenciar imagens
            </button>
          </div>

          {/* Image Gallery Preview */}
          {productMedia.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {productMedia.map((media) => (
                <div
                  key={media.id}
                  className={cn(
                    'relative group aspect-square rounded-lg overflow-hidden border-2',
                    media.isMain
                      ? 'border-primary-500'
                      : 'border-dark-200 dark:border-dark-700'
                  )}
                >
                  <img
                    src={media.url}
                    alt={media.originalName}
                    className="w-full h-full object-cover"
                  />
                  {media.isMain && (
                    <div className="absolute top-2 left-2 bg-primary-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      Principal
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div
              onClick={() => setIsImageManagerOpen(true)}
              className="border-2 border-dashed border-dark-200 dark:border-dark-700 rounded-lg p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-dark-50 dark:hover:bg-dark-800 transition-colors"
            >
              <ImageIcon className="w-12 h-12 mx-auto mb-2 text-dark-300" />
              <p className="text-dark-500 dark:text-dark-400">
                Nenhuma imagem adicionada
              </p>
              <p className="text-sm text-dark-400 mt-1">
                Clique para adicionar imagens via upload ou URL
              </p>
            </div>
          )}
        </div>

        {/* Image Manager Modal */}
        <ImageManager
          productId={params.id as string}
          isOpen={isImageManagerOpen}
          onClose={() => setIsImageManagerOpen(false)}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ['product', params.id] });
          }}
        />

        {/* AI Assistant */}
        <AIAssistant
          productId={params.id as string}
          productName={formData.name}
          productSku={product.sku}
          brand={formData.brand}
          category={product.categories?.[0]?.name}
          description={formData.description}
          shortDescription={formData.shortDescription}
          price={formData.price ? parseFloat(formData.price) : undefined}
          onApplyDescription={(data) => {
            setFormData((prev) => ({
              ...prev,
              shortDescription: data.shortDescription,
              description: data.description,
            }));
          }}
          onApplySEO={(data) => {
            setFormData((prev) => ({
              ...prev,
              metaTitle: data.metaTitle,
              metaDescription: data.metaDescription,
              urlKey: data.urlKey,
            }));
          }}
        />

        {/* Informações Básicas */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">
            Informações Básicas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                Nome *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`input ${errors.name ? 'border-red-500' : ''}`}
                placeholder="Nome do produto"
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name}</p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                Descrição Curta
              </label>
              <textarea
                name="shortDescription"
                value={formData.shortDescription}
                onChange={handleChange}
                rows={2}
                className="input"
                placeholder="Breve descrição do produto"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                Descrição Completa
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="input"
                placeholder="Descrição detalhada do produto"
              />
            </div>
          </div>
        </div>

        {/* Preços */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">
            Preços
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                Preço de Venda (R$)
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="input"
                placeholder="0,00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                Preço de Custo (R$)
              </label>
              <input
                type="number"
                name="costPrice"
                value={formData.costPrice}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="input"
                placeholder="0,00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                Peso (kg)
              </label>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                step="0.001"
                min="0"
                className="input"
                placeholder="0,000"
              />
            </div>
          </div>
        </div>

        {/* Marca e Fabricante */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">
            Marca e Fabricante
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                Marca
              </label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                className="input"
                placeholder="Ex: Apple, Samsung..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                Fabricante
              </label>
              <input
                type="text"
                name="manufacturer"
                value={formData.manufacturer}
                onChange={handleChange}
                className="input"
                placeholder="Nome do fabricante"
              />
            </div>
          </div>
        </div>

        {/* Estoque */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">
            Estoque
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                Quantidade em Estoque
              </label>
              <input
                type="number"
                name="stockQuantity"
                value={formData.stockQuantity}
                onChange={handleChange}
                min="0"
                className="input"
                placeholder="0"
              />
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="isInStock"
                  checked={formData.isInStock}
                  onChange={(e) => setFormData(prev => ({ ...prev, isInStock: e.target.checked }))}
                  className="rounded border-dark-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-dark-700 dark:text-dark-300">Disponível em estoque</span>
              </label>
            </div>
          </div>
        </div>

        {/* Variantes - apenas para produtos configuraveis */}
        {product.type === 'CONFIGURABLE' && (
          <VariantManager
            productId={params.id as string}
            productSku={product.sku}
            productName={formData.name}
          />
        )}

        {/* Bundle (Kit) - apenas para produtos bundle */}
        {product.type === 'BUNDLE' && (
          <div className="card p-6">
            <BundleManager
              bundleId={params.id as string}
              components={bundleComponents}
              onComponentsChange={(components) => {
                setBundleComponents(components);
                queryClient.invalidateQueries({ queryKey: ['bundle-components', params.id] });
              }}
            />
          </div>
        )}

        {/* Agrupado - apenas para produtos agrupados */}
        {product.type === 'GROUPED' && (
          <div className="card p-6">
            <GroupedProductManager
              parentId={params.id as string}
              items={groupedItems}
              onItemsChange={(items) => {
                setGroupedItems(items);
                queryClient.invalidateQueries({ queryKey: ['grouped-items', params.id] });
              }}
            />
          </div>
        )}

        {/* Virtual - apenas para produtos virtuais */}
        {product.type === 'VIRTUAL' && (
          <div className="card p-6">
            <VirtualProductManager
              data={virtualData}
              onChange={(data) => setVirtualData(data)}
            />
          </div>
        )}

        {/* SEO */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">
            SEO
          </h2>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                URL Amigável
              </label>
              <input
                type="text"
                name="urlKey"
                value={formData.urlKey}
                onChange={handleChange}
                className="input"
                placeholder="meu-produto"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                Meta Título
              </label>
              <input
                type="text"
                name="metaTitle"
                value={formData.metaTitle}
                onChange={handleChange}
                className="input"
                placeholder="Título para SEO"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                Meta Descrição
              </label>
              <textarea
                name="metaDescription"
                value={formData.metaDescription}
                onChange={handleChange}
                rows={2}
                className="input"
                placeholder="Descrição para SEO (máx. 160 caracteres)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                Palavras-chave
              </label>
              <input
                type="text"
                name="metaKeywords"
                value={formData.metaKeywords}
                onChange={handleChange}
                className="input"
                placeholder="palavra1, palavra2, palavra3"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link href={`/products/${params.id}`} className="btn-secondary">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn-primary"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Alterações
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
