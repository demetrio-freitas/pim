'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency, getStatusColor, getStatusLabel, cn } from '@/lib/utils';
import { ProductStatus } from '@/types';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Package,
  DollarSign,
  BarChart3,
  Loader2,
  Star,
  Sparkles,
  Tag,
  AlertTriangle,
  CheckCircle,
  Copy,
} from 'lucide-react';
import { useState } from 'react';
import { showSuccess, showError } from '@/lib/toast';
import { ApiError } from '@/types';
import ProductHistoryDiff from '@/components/ProductHistoryDiff';
import ProductChannelValidation from '@/components/ProductChannelValidation';
import ProductImageGallery from '@/components/ProductImageGallery';
import { VariantManager } from '@/components/VariantManager';

const statusFlow: { from: ProductStatus; to: ProductStatus; label: string }[] = [
  { from: 'DRAFT', to: 'PENDING_REVIEW', label: 'Enviar para Revisão' },
  { from: 'PENDING_REVIEW', to: 'APPROVED', label: 'Aprovar' },
  { from: 'PENDING_REVIEW', to: 'DRAFT', label: 'Rejeitar' },
  { from: 'APPROVED', to: 'PUBLISHED', label: 'Publicar' },
  { from: 'PUBLISHED', to: 'ARCHIVED', label: 'Arquivar' },
  { from: 'ARCHIVED', to: 'DRAFT', label: 'Restaurar' },
];

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateOptions, setDuplicateOptions] = useState({
    newSku: '',
    newName: '',
    copyImages: true,
  });

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', params.id],
    queryFn: () => api.getProduct(params.id as string),
  });

  const statusMutation = useMutation({
    mutationFn: ({ status }: { status: ProductStatus }) =>
      api.updateProductStatus(params.id as string, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', params.id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteProduct(params.id as string),
    onSuccess: () => {
      router.push('/products');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (options: { newSku?: string; newName?: string; copyImages?: boolean }) =>
      api.duplicateProduct(params.id as string, options),
    onSuccess: (newProduct) => {
      showSuccess(`Produto duplicado com sucesso!`);
      setShowDuplicateModal(false);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      router.push(`/products/${newProduct.id}/edit`);
    },
    onError: (error: ApiError) => showError(error),
  });

  const handleDelete = () => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      setIsDeleting(true);
      deleteMutation.mutate();
    }
  };

  const handleDuplicateClick = () => {
    if (!product) return;
    setDuplicateOptions({
      newSku: `${product.sku}-COPY`,
      newName: `${product.name} (Cópia)`,
      copyImages: true,
    });
    setShowDuplicateModal(true);
  };

  const handleDuplicateConfirm = () => {
    duplicateMutation.mutate({
      newSku: duplicateOptions.newSku || undefined,
      newName: duplicateOptions.newName || undefined,
      copyImages: duplicateOptions.copyImages,
    });
  };

  const availableTransitions = statusFlow.filter(
    (t) => t.from === product?.status
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="text-center py-12">
        <p className="text-dark-500 dark:text-dark-400">Produto não encontrado</p>
        <Link href="/products" className="btn-primary mt-4 inline-block">
          Voltar para Produtos
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/products"
            className="p-2 hover:bg-dark-100 dark:hover:bg-dark-800 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-dark-900 dark:text-white">
              {product.name}
            </h1>
            <p className="text-dark-500 dark:text-dark-400 mt-1 font-mono">
              SKU: {product.sku}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/products/${params.id}/edit`} className="btn-secondary">
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Link>
          <button
            onClick={handleDuplicateClick}
            className="btn-secondary text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20"
          >
            <Copy className="w-4 h-4 mr-2" />
            Duplicar
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="btn-secondary text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </>
            )}
          </button>
        </div>
      </div>

      {/* Product Badges */}
      <div className="flex flex-wrap gap-2">
        {/* Status Badge */}
        <span className={cn('badge text-sm px-3 py-1.5 font-medium', getStatusColor(product.status))}>
          {getStatusLabel(product.status)}
        </span>

        {/* Featured Badge */}
        {product.isFeatured && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full text-sm font-medium">
            <Star className="w-4 h-4 fill-current" />
            Destaque
          </span>
        )}

        {/* New Product Badge */}
        {product.isNew && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            Novo
          </span>
        )}

        {/* On Sale Badge */}
        {product.isOnSale && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full text-sm font-medium">
            <Tag className="w-4 h-4" />
            Em Promoção
          </span>
        )}

        {/* Stock Alert Badge */}
        {!product.isInStock && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full text-sm font-medium">
            <AlertTriangle className="w-4 h-4" />
            Fora de Estoque
          </span>
        )}
        {product.isInStock && product.stockQuantity < 10 && product.stockQuantity > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded-full text-sm font-medium">
            <AlertTriangle className="w-4 h-4" />
            Estoque Baixo ({product.stockQuantity})
          </span>
        )}

        {/* Completeness Badge */}
        <span className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
          product.completenessScore >= 80
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : product.completenessScore >= 50
            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        )}>
          {product.completenessScore >= 80 ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          {product.completenessScore}% Completo
        </span>
      </div>

      {/* Status Actions */}
      {availableTransitions.length > 0 && (
        <div className="card p-4 flex items-center justify-between">
          <span className="text-sm text-dark-500 dark:text-dark-400">
            Alterar status do produto:
          </span>
          <div className="flex items-center gap-2">
            {availableTransitions.map((transition) => (
              <button
                key={transition.to}
                onClick={() => statusMutation.mutate({ status: transition.to })}
                disabled={statusMutation.isPending}
                className="btn-secondary text-sm"
              >
                {transition.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Image Gallery */}
      <ProductImageGallery
        media={product.media || []}
        productName={product.name}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Descrição */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">
              Descrição
            </h2>
            {product.shortDescription && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-dark-500 dark:text-dark-400 mb-1">
                  Descrição Curta
                </h3>
                <p className="text-dark-700 dark:text-dark-300">
                  {product.shortDescription}
                </p>
              </div>
            )}
            {product.description ? (
              <div>
                <h3 className="text-sm font-medium text-dark-500 dark:text-dark-400 mb-1">
                  Descrição Completa
                </h3>
                <p className="text-dark-700 dark:text-dark-300 whitespace-pre-wrap">
                  {product.description}
                </p>
              </div>
            ) : (
              <p className="text-dark-400 italic">Sem descrição</p>
            )}
          </div>

          {/* SEO */}
          {(product.metaTitle || product.metaDescription || product.urlKey) && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">
                SEO
              </h2>
              <div className="space-y-3">
                {product.urlKey && (
                  <div>
                    <span className="text-sm text-dark-500 dark:text-dark-400">
                      URL:
                    </span>
                    <span className="ml-2 text-dark-700 dark:text-dark-300">
                      /{product.urlKey}
                    </span>
                  </div>
                )}
                {product.metaTitle && (
                  <div>
                    <span className="text-sm text-dark-500 dark:text-dark-400">
                      Meta Título:
                    </span>
                    <span className="ml-2 text-dark-700 dark:text-dark-300">
                      {product.metaTitle}
                    </span>
                  </div>
                )}
                {product.metaDescription && (
                  <div>
                    <span className="text-sm text-dark-500 dark:text-dark-400">
                      Meta Descrição:
                    </span>
                    <span className="ml-2 text-dark-700 dark:text-dark-300">
                      {product.metaDescription}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Categorias */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">
              Categorias
            </h2>
            {product.categories?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {product.categories.map((cat: any) => (
                  <span
                    key={cat.id}
                    className="px-3 py-1 bg-dark-100 dark:bg-dark-800 rounded-full text-sm"
                  >
                    {cat.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-dark-400 italic">Nenhuma categoria associada</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Preços */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-dark-900 dark:text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Preços
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-dark-500 dark:text-dark-400">Preço de Venda</span>
                <span className="font-semibold text-dark-900 dark:text-white">
                  {formatCurrency(product.price)}
                </span>
              </div>
              {product.costPrice && (
                <div className="flex justify-between">
                  <span className="text-dark-500 dark:text-dark-400">Preço de Custo</span>
                  <span className="text-dark-700 dark:text-dark-300">
                    {formatCurrency(product.costPrice)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Detalhes */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-dark-900 dark:text-white mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Detalhes
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-dark-500 dark:text-dark-400">Tipo</span>
                <span className="text-dark-700 dark:text-dark-300">{product.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-500 dark:text-dark-400">Peso</span>
                <span className="text-dark-700 dark:text-dark-300">
                  {product.weight ? `${product.weight} kg` : '-'}
                </span>
              </div>
              {product.brand && (
                <div className="flex justify-between">
                  <span className="text-dark-500 dark:text-dark-400">Marca</span>
                  <span className="text-dark-700 dark:text-dark-300">{product.brand}</span>
                </div>
              )}
              {product.manufacturer && (
                <div className="flex justify-between">
                  <span className="text-dark-500 dark:text-dark-400">Fabricante</span>
                  <span className="text-dark-700 dark:text-dark-300">
                    {product.manufacturer}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Estoque */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-dark-900 dark:text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Estoque
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-dark-500 dark:text-dark-400">Quantidade</span>
                <span className="text-dark-700 dark:text-dark-300">
                  {product.stockQuantity}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-500 dark:text-dark-400">Em Estoque</span>
                <span
                  className={cn(
                    'font-medium',
                    product.isInStock ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {product.isInStock ? 'Sim' : 'Não'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Variantes - apenas para produtos configuraveis */}
      {product.type === 'CONFIGURABLE' && (
        <VariantManager
          productId={params.id as string}
          productSku={product.sku}
          productName={product.name}
        />
      )}

      {/* Marketplace Channel Validation */}
      <ProductChannelValidation productId={params.id as string} />

      {/* Product History with Visual Diff */}
      <ProductHistoryDiff productId={params.id as string} />

      {/* Duplicate Product Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-dark-200 dark:border-dark-700">
              <h2 className="text-xl font-semibold text-dark-900 dark:text-white flex items-center gap-2">
                <Copy className="w-5 h-5 text-primary-500" />
                Duplicar Produto
              </h2>
              <p className="text-sm text-dark-500 mt-1">
                Criando cópia de: <strong>{product.name}</strong>
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                  Novo SKU <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={duplicateOptions.newSku}
                  onChange={(e) => setDuplicateOptions(prev => ({ ...prev, newSku: e.target.value }))}
                  placeholder="Ex: SKU-NOVO"
                  className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700"
                />
                <p className="text-xs text-dark-500 mt-1">
                  O SKU deve ser único no sistema
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                  Novo Nome
                </label>
                <input
                  type="text"
                  value={duplicateOptions.newName}
                  onChange={(e) => setDuplicateOptions(prev => ({ ...prev, newName: e.target.value }))}
                  placeholder="Ex: Produto (Cópia)"
                  className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="copyImagesDetail"
                  checked={duplicateOptions.copyImages}
                  onChange={(e) => setDuplicateOptions(prev => ({ ...prev, copyImages: e.target.checked }))}
                  className="w-4 h-4 rounded border-dark-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="copyImagesDetail" className="text-sm text-dark-700 dark:text-dark-300">
                  Copiar imagens do produto original
                </label>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>O que será copiado:</strong>
                </p>
                <ul className="text-sm text-blue-600 dark:text-blue-400 mt-1 list-disc list-inside">
                  <li>Todas as informações do produto</li>
                  <li>Preços, estoque e configurações</li>
                  <li>Categorias e atributos</li>
                  {duplicateOptions.copyImages && <li>Imagens do produto</li>}
                </ul>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                  O novo produto será criado com status <strong>Rascunho</strong>.
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-dark-200 dark:border-dark-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDuplicateModal(false);
                  setDuplicateOptions({ newSku: '', newName: '', copyImages: true });
                }}
                className="px-4 py-2 text-dark-700 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleDuplicateConfirm}
                disabled={duplicateMutation.isPending || !duplicateOptions.newSku.trim()}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {duplicateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Duplicando...
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Duplicar Produto
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
