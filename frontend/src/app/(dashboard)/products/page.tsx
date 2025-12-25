'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency, getStatusColor, getStatusLabel, cn } from '@/lib/utils';
import { showSuccess, showError } from '@/lib/toast';
import { Product, ProductStatus, ApiError } from '@/types';
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Loader2,
  CheckSquare,
  Square,
  MinusSquare,
  X,
  Archive,
  Send,
  ImageIcon,
  Filter,
  ChevronDown,
  Settings2,
  GripVertical,
  Copy,
  MoreVertical,
  Package,
} from 'lucide-react';
import { SavedFiltersDropdown } from '@/components/SavedFiltersDropdown';
import { SortControl, parseSortValue } from '@/components/SortControl';
import { SearchAutocomplete } from '@/components/SearchAutocomplete';

// Filter state type for saved filters
interface ProductFiltersState {
  search: string;
  status: ProductStatus | '';
  categoryId: string;
  productType: string;
  lowStockFilter: boolean;
  noImagesFilter: boolean;
  incompleteFilter: boolean;
}

const statusOptions: { value: ProductStatus | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'DRAFT', label: 'Rascunho' },
  { value: 'PENDING_REVIEW', label: 'Aguardando Revisão' },
  { value: 'APPROVED', label: 'Aprovado' },
  { value: 'PUBLISHED', label: 'Publicado' },
  { value: 'ARCHIVED', label: 'Arquivado' },
];

const productTypeOptions = [
  { value: '', label: 'Todos', icon: '📦' },
  { value: 'SIMPLE', label: 'Simples', icon: '📄' },
  { value: 'CONFIGURABLE', label: 'Variante', icon: '🔀' },
  { value: 'BUNDLE', label: 'Bundle', icon: '📦' },
];

// Column configuration
interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  required?: boolean;
}

const defaultColumns: ColumnConfig[] = [
  { id: 'image', label: 'Imagem', visible: true },
  { id: 'name', label: 'Produto', visible: true, required: true },
  { id: 'sku', label: 'SKU', visible: true },
  { id: 'price', label: 'Preço', visible: true },
  { id: 'stock', label: 'Estoque', visible: false },
  { id: 'status', label: 'Status', visible: true },
  { id: 'completeness', label: 'Completude', visible: true },
  { id: 'brand', label: 'Marca', visible: false },
  { id: 'type', label: 'Tipo', visible: false },
  { id: 'categories', label: 'Categorias', visible: false },
  { id: 'createdAt', label: 'Criado em', visible: false },
];

// Helper to get columns from localStorage
const getStoredColumns = (): ColumnConfig[] => {
  if (typeof window === 'undefined') return defaultColumns;
  const stored = localStorage.getItem('productListColumns');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return defaultColumns.map(col => ({
        ...col,
        visible: parsed.find((p: ColumnConfig) => p.id === col.id)?.visible ?? col.visible,
      }));
    } catch {
      return defaultColumns;
    }
  }
  return defaultColumns;
};

// Product Card Component for Mobile
function ProductCard({
  product,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  isDeleting
}: {
  product: Product;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  isDeleting: boolean;
}) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div className={cn(
      'card p-3 relative',
      isSelected && 'ring-2 ring-primary-500'
    )}>
      <div className="flex gap-3">
        {/* Checkbox */}
        <button
          onClick={onSelect}
          className="flex-shrink-0 mt-1"
        >
          {isSelected ? (
            <CheckSquare className="w-5 h-5 text-primary-600" />
          ) : (
            <Square className="w-5 h-5 text-dark-400" />
          )}
        </button>

        {/* Image */}
        <Link href={`/products/${product.id}`} className="flex-shrink-0">
          {product.mainImageUrl ? (
            <img
              src={product.mainImageUrl}
              alt={product.name}
              className="w-16 h-16 object-cover rounded-lg border border-dark-200 dark:border-dark-700"
            />
          ) : (
            <div className="w-16 h-16 bg-dark-100 dark:bg-dark-800 rounded-lg border border-dark-200 dark:border-dark-700 flex items-center justify-center">
              <Package className="w-6 h-6 text-dark-400" />
            </div>
          )}
        </Link>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <Link href={`/products/${product.id}`}>
            <h3 className="font-medium text-dark-900 dark:text-white truncate text-sm">
              {product.name}
            </h3>
          </Link>
          <p className="text-xs text-dark-500 dark:text-dark-400 font-mono mt-0.5">
            {product.sku}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="font-semibold text-dark-900 dark:text-white text-sm">
              {formatCurrency(product.price)}
            </span>
            <span className={cn('badge text-xs', getStatusColor(product.status))}>
              {getStatusLabel(product.status)}
            </span>
          </div>
          {/* Completeness bar */}
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1.5 bg-dark-200 dark:bg-dark-700 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full',
                  product.completenessScore >= 80
                    ? 'bg-green-500'
                    : product.completenessScore >= 50
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                )}
                style={{ width: `${product.completenessScore}%` }}
              />
            </div>
            <span className="text-xs text-dark-500">{product.completenessScore}%</span>
          </div>
        </div>

        {/* Actions Menu */}
        <div className="relative">
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-1.5 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
          >
            <MoreVertical className="w-5 h-5 text-dark-500" />
          </button>
          {showActions && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowActions(false)}
              />
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-dark-800 rounded-lg shadow-lg border border-dark-200 dark:border-dark-700 z-20 py-1 min-w-[140px]">
                <Link
                  href={`/products/${product.id}`}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-dark-50 dark:hover:bg-dark-700"
                >
                  <Eye className="w-4 h-4" /> Ver
                </Link>
                <Link
                  href={`/products/${product.id}/edit`}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-dark-50 dark:hover:bg-dark-700"
                >
                  <Edit className="w-4 h-4" /> Editar
                </Link>
                <button
                  onClick={() => { onDuplicate(); setShowActions(false); }}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-dark-50 dark:hover:bg-dark-700 w-full text-left text-primary-600"
                >
                  <Copy className="w-4 h-4" /> Duplicar
                </button>
                <button
                  onClick={() => { onDelete(); setShowActions(false); }}
                  disabled={isDeleting}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left text-red-600"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Excluir
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProductStatus | ''>(
    (searchParams.get('status') as ProductStatus) || ''
  );
  const [categoryId, setCategoryId] = useState<string>('');
  const [productType, setProductType] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [lowStockFilter, setLowStockFilter] = useState(searchParams.get('lowStock') === 'true');
  const [noImagesFilter, setNoImagesFilter] = useState(searchParams.get('noImages') === 'true');
  const [incompleteFilter, setIncompleteFilter] = useState(searchParams.get('incomplete') === 'true');
  const [page, setPage] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditField, setBulkEditField] = useState<string>('');
  const [bulkEditValue, setBulkEditValue] = useState<string>('');
  const [columns, setColumns] = useState<ColumnConfig[]>(defaultColumns);
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const columnConfigRef = useRef<HTMLDivElement>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicatingProduct, setDuplicatingProduct] = useState<Product | null>(null);
  const [duplicateOptions, setDuplicateOptions] = useState({
    newSku: '',
    newName: '',
    copyImages: true,
  });
  const [sortBy, setSortBy] = useState('name-asc');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Load columns from localStorage on mount
  useEffect(() => {
    setColumns(getStoredColumns());
  }, []);

  // Close column config dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnConfigRef.current && !columnConfigRef.current.contains(event.target as Node)) {
        setShowColumnConfig(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleColumn = (columnId: string) => {
    const updated = columns.map(col =>
      col.id === columnId && !col.required ? { ...col, visible: !col.visible } : col
    );
    setColumns(updated);
    localStorage.setItem('productListColumns', JSON.stringify(updated));
  };

  const resetColumns = () => {
    setColumns(defaultColumns);
    localStorage.removeItem('productListColumns');
  };

  const isColumnVisible = (columnId: string) => columns.find(c => c.id === columnId)?.visible ?? true;
  const visibleColumnsCount = columns.filter(c => c.visible).length + 2;

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
  });

  const getQueryFn = () => {
    const { field, direction } = parseSortValue(sortBy);

    if (lowStockFilter) {
      return api.getLowStockProducts(10, { page, size: 20 });
    }
    if (noImagesFilter) {
      return api.getNoImagesProducts({ page, size: 20 });
    }
    if (incompleteFilter) {
      return api.getIncompleteProducts(80, { page, size: 20 });
    }
    return api.getProducts({
      search: search || undefined,
      status: status || undefined,
      categoryId: categoryId || undefined,
      type: productType || undefined,
      sortBy: field,
      sortDirection: direction,
      page,
      size: 20,
    });
  };

  const { data, isLoading, error, refetch, isError } = useQuery({
    queryKey: ['products', { search, status, categoryId, productType, page, lowStockFilter, noImagesFilter, incompleteFilter, sortBy }],
    queryFn: getQueryFn,
  });

  const activeFiltersCount = [
    status,
    categoryId,
    lowStockFilter,
    noImagesFilter,
    incompleteFilter,
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setStatus('');
    setCategoryId('');
    setProductType('');
    setLowStockFilter(false);
    setNoImagesFilter(false);
    setIncompleteFilter(false);
    setSearch('');
  };

  const deleteMutation = useMutation({
    mutationFn: (productId: string) => api.deleteProduct(productId),
    onSuccess: () => {
      showSuccess('Produto excluído com sucesso');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: ApiError) => showError(error),
    onSettled: () => setDeletingId(null),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (productIds: string[]) => api.bulkDeleteProducts(productIds),
    onSuccess: (result) => {
      showSuccess(`${result.deletedCount || selectedProducts.size} produtos excluídos`);
      setSelectedProducts(new Set());
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: ApiError) => showError(error),
  });

  const bulkPublishMutation = useMutation({
    mutationFn: (productIds: string[]) => api.bulkPublishProducts(productIds),
    onSuccess: (result) => {
      showSuccess(`${result.updatedCount || selectedProducts.size} produtos publicados`);
      setSelectedProducts(new Set());
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: ApiError) => showError(error),
  });

  const bulkUnpublishMutation = useMutation({
    mutationFn: (productIds: string[]) => api.bulkUnpublishProducts(productIds),
    onSuccess: (result) => {
      showSuccess(`${result.updatedCount || selectedProducts.size} produtos despublicados`);
      setSelectedProducts(new Set());
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: ApiError) => showError(error),
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: ({ productIds, updates }: { productIds: string[]; updates: Record<string, any> }) =>
      api.bulkUpdateProducts(productIds, updates),
    onSuccess: (result) => {
      showSuccess(`${result.updatedCount || selectedProducts.size} produtos atualizados`);
      setSelectedProducts(new Set());
      setShowBulkEditModal(false);
      setBulkEditField('');
      setBulkEditValue('');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: ApiError) => showError(error),
  });

  const duplicateMutation = useMutation({
    mutationFn: ({ productId, options }: { productId: string; options: { newSku?: string; newName?: string; copyImages?: boolean } }) =>
      api.duplicateProduct(productId, options),
    onSuccess: (newProduct) => {
      showSuccess(`Produto duplicado! Novo SKU: ${newProduct.sku}`);
      setShowDuplicateModal(false);
      setDuplicatingProduct(null);
      setDuplicateOptions({ newSku: '', newName: '', copyImages: true });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: ApiError) => showError(error),
  });

  const handleDelete = (product: Product) => {
    if (confirm(`Deseja excluir "${product.name}"?`)) {
      setDeletingId(product.id);
      deleteMutation.mutate(product.id);
    }
  };

  const handleDuplicate = (product: Product) => {
    setDuplicatingProduct(product);
    setDuplicateOptions({
      newSku: `${product.sku}-COPY`,
      newName: `${product.name} (Cópia)`,
      copyImages: true,
    });
    setShowDuplicateModal(true);
  };

  const handleDuplicateConfirm = () => {
    if (!duplicatingProduct) return;
    duplicateMutation.mutate({
      productId: duplicatingProduct.id,
      options: {
        newSku: duplicateOptions.newSku || undefined,
        newName: duplicateOptions.newName || undefined,
        copyImages: duplicateOptions.copyImages,
      },
    });
  };

  const handleSelectAll = () => {
    if (!data?.content) return;
    const allIds = data.content.map((p: Product) => p.id);
    const allSelected = allIds.every((id: string) => selectedProducts.has(id));
    setSelectedProducts(allSelected ? new Set() : new Set(allIds));
  };

  const handleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleBulkDelete = () => {
    if (confirm(`Excluir ${selectedProducts.size} produtos?`)) {
      bulkDeleteMutation.mutate(Array.from(selectedProducts));
    }
  };

  const handleBulkPublish = () => {
    if (confirm(`Publicar ${selectedProducts.size} produtos?`)) {
      bulkPublishMutation.mutate(Array.from(selectedProducts));
    }
  };

  const handleBulkUnpublish = () => {
    if (confirm(`Despublicar ${selectedProducts.size} produtos?`)) {
      bulkUnpublishMutation.mutate(Array.from(selectedProducts));
    }
  };

  const handleBulkUpdate = () => {
    if (!bulkEditField || bulkEditValue === '') return;

    const updates: Record<string, any> = {};

    switch (bulkEditField) {
      case 'status': updates.status = bulkEditValue; break;
      case 'price': updates.price = parseFloat(bulkEditValue); break;
      case 'stockQuantity': updates.stockQuantity = parseInt(bulkEditValue); break;
      case 'brand': updates.brand = bulkEditValue; break;
      case 'vendor': updates.vendor = bulkEditValue; break;
      case 'taxable': updates.taxable = bulkEditValue === 'true'; break;
      case 'requiresShipping': updates.requiresShipping = bulkEditValue === 'true'; break;
      case 'inventoryPolicy': updates.inventoryPolicy = bulkEditValue; break;
      case 'weight': updates.weight = parseFloat(bulkEditValue); break;
      case 'weightUnit': updates.weightUnit = bulkEditValue; break;
      case 'isFeatured': updates.isFeatured = bulkEditValue === 'true'; break;
      case 'isNew': updates.isNew = bulkEditValue === 'true'; break;
      case 'isOnSale': updates.isOnSale = bulkEditValue === 'true'; break;
      default: updates[bulkEditField] = bulkEditValue;
    }

    bulkUpdateMutation.mutate({ productIds: Array.from(selectedProducts), updates });
  };

  const allSelected = data?.content?.length > 0 && data.content.every((p: Product) => selectedProducts.has(p.id));
  const someSelected = data?.content?.some((p: Product) => selectedProducts.has(p.id)) && !allSelected;

  const bulkEditFields = [
    { value: 'status', label: 'Status', type: 'select', options: statusOptions.filter(s => s.value) },
    { value: 'price', label: 'Preço', type: 'number' },
    { value: 'stockQuantity', label: 'Estoque', type: 'number' },
    { value: 'brand', label: 'Marca', type: 'text' },
    { value: 'vendor', label: 'Fornecedor', type: 'text' },
    { value: 'taxable', label: 'Tributável', type: 'boolean' },
    { value: 'requiresShipping', label: 'Requer Frete', type: 'boolean' },
    { value: 'isFeatured', label: 'Destaque', type: 'boolean' },
    { value: 'isNew', label: 'Novo', type: 'boolean' },
    { value: 'isOnSale', label: 'Em Promoção', type: 'boolean' },
  ];

  const selectedField = bulkEditFields.find(f => f.value === bulkEditField);

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-dark-900 dark:text-white">Produtos</h1>
          <p className="text-sm text-dark-500 dark:text-dark-400 mt-1 hidden sm:block">
            Gerencie seu catálogo de produtos
          </p>
        </div>
        <Link href="/products/new" className="btn-primary text-sm lg:text-base">
          <Plus className="w-4 h-4 lg:mr-2" />
          <span className="hidden lg:inline">Novo Produto</span>
        </Link>
      </div>

      {/* Bulk Actions Bar - Responsivo */}
      {selectedProducts.size > 0 && (
        <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-3 lg:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 lg:w-5 lg:h-5 text-primary-600" />
              <span className="text-primary-700 dark:text-primary-300 font-medium text-sm lg:text-base">
                {selectedProducts.size} selecionado(s)
              </span>
            </div>
            <div className="flex items-center gap-1 lg:gap-2">
              <button
                onClick={handleBulkPublish}
                disabled={bulkPublishMutation.isPending}
                className="p-2 lg:px-3 lg:py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                title="Publicar"
              >
                <Send className="w-4 h-4" />
              </button>
              <button
                onClick={handleBulkUnpublish}
                disabled={bulkUnpublishMutation.isPending}
                className="p-2 lg:px-3 lg:py-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50"
                title="Despublicar"
              >
                <Archive className="w-4 h-4" />
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleteMutation.isPending}
                className="p-2 lg:px-3 lg:py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                title="Excluir"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSelectedProducts(new Set())}
                className="p-2 text-dark-500 hover:text-dark-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Type Tabs - Scroll horizontal no mobile */}
      <div className="flex overflow-x-auto border-b border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-900 rounded-t-xl -mx-4 px-4 lg:mx-0 lg:px-0">
        {productTypeOptions.map((type) => (
          <button
            key={type.value}
            onClick={() => {
              setProductType(type.value);
              setPage(0);
              if (lowStockFilter || noImagesFilter || incompleteFilter) {
                setLowStockFilter(false);
                setNoImagesFilter(false);
                setIncompleteFilter(false);
              }
            }}
            className={cn(
              'flex items-center gap-2 px-4 lg:px-5 py-2.5 lg:py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              productType === type.value
                ? 'border-primary-500 text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                : 'border-transparent text-dark-500 dark:text-dark-400 hover:text-dark-700 dark:hover:text-dark-300'
            )}
          >
            <span>{type.icon}</span>
            {type.label}
          </button>
        ))}
      </div>

      {/* Filters - Responsivo */}
      <div className="card p-3 lg:p-4 space-y-3 lg:space-y-4 rounded-t-none border-t-0">
        {/* Mobile: Busca + Botão filtros */}
        <div className="flex gap-2">
          <div className="flex-1">
            <SearchAutocomplete
              value={search}
              onChange={setSearch}
              onSearch={(value) => { setSearch(value); setPage(0); }}
              onSelectSuggestion={(suggestion) => {
                if (suggestion.type === 'category') {
                  setCategoryId(suggestion.id);
                  setSearch('');
                } else {
                  setSearch(suggestion.text);
                }
                setPage(0);
              }}
              placeholder="Buscar..."
              disabled={lowStockFilter || noImagesFilter || incompleteFilter}
            />
          </div>

          {/* Mobile filter button */}
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className={cn(
              'lg:hidden p-2.5 rounded-lg border',
              activeFiltersCount > 0
                ? 'border-primary-500 bg-primary-50 text-primary-600'
                : 'border-dark-300 dark:border-dark-600'
            )}
          >
            <Filter className="w-5 h-5" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Desktop filters */}
          <div className="hidden lg:flex gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProductStatus | '')}
              className="input w-48"
              disabled={lowStockFilter || noImagesFilter || incompleteFilter}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={cn(
                'btn-secondary flex items-center gap-2',
                activeFiltersCount > 0 && 'border-primary-500 text-primary-600'
              )}
            >
              <Filter className="w-4 h-4" />
              Filtros
              {activeFiltersCount > 0 && (
                <span className="bg-primary-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </button>
            <div className="relative" ref={columnConfigRef}>
              <button
                onClick={() => setShowColumnConfig(!showColumnConfig)}
                className="btn-secondary flex items-center gap-2"
              >
                <Settings2 className="w-4 h-4" />
                Colunas
              </button>
              {showColumnConfig && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-dark-800 rounded-lg shadow-lg border border-dark-200 dark:border-dark-700 z-50">
                  <div className="p-3 border-b border-dark-200 dark:border-dark-700 flex items-center justify-between">
                    <span className="font-medium text-dark-900 dark:text-white">Colunas</span>
                    <button onClick={resetColumns} className="text-xs text-primary-600">Restaurar</button>
                  </div>
                  <div className="p-2 max-h-64 overflow-y-auto">
                    {columns.map((col) => (
                      <label key={col.id} className={cn(
                        'flex items-center gap-2 px-2 py-1.5 rounded hover:bg-dark-50 dark:hover:bg-dark-700 cursor-pointer',
                        col.required && 'opacity-50 cursor-not-allowed'
                      )}>
                        <input
                          type="checkbox"
                          checked={col.visible}
                          onChange={() => toggleColumn(col.id)}
                          disabled={col.required}
                          className="rounded border-dark-300 text-primary-600"
                        />
                        <span className="text-sm">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <SortControl
              value={sortBy}
              onChange={(value) => { setSortBy(value); setPage(0); }}
              disabled={lowStockFilter || noImagesFilter || incompleteFilter}
            />
            <SavedFiltersDropdown<ProductFiltersState>
              storageKey="pim_product_filters"
              currentFilters={{ search, status, categoryId, productType, lowStockFilter, noImagesFilter, incompleteFilter }}
              onLoadFilter={(filters) => {
                setSearch(filters.search);
                setStatus(filters.status);
                setCategoryId(filters.categoryId);
                setProductType(filters.productType);
                setLowStockFilter(filters.lowStockFilter);
                setNoImagesFilter(filters.noImagesFilter);
                setIncompleteFilter(filters.incompleteFilter);
                setPage(0);
              }}
            />
          </div>
        </div>

        {/* Mobile Filters Panel */}
        {showMobileFilters && (
          <div className="lg:hidden space-y-3 pt-3 border-t border-dark-100 dark:border-dark-800">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProductStatus | '')}
              className="input w-full"
              disabled={lowStockFilter || noImagesFilter || incompleteFilter}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setLowStockFilter(!lowStockFilter);
                  if (!lowStockFilter) { setNoImagesFilter(false); setIncompleteFilter(false); }
                }}
                className={cn(
                  'px-3 py-1.5 rounded-lg border text-sm font-medium',
                  lowStockFilter
                    ? 'bg-orange-100 border-orange-500 text-orange-700'
                    : 'border-dark-300 text-dark-600'
                )}
              >
                Estoque Baixo
              </button>
              <button
                onClick={() => {
                  setNoImagesFilter(!noImagesFilter);
                  if (!noImagesFilter) { setLowStockFilter(false); setIncompleteFilter(false); }
                }}
                className={cn(
                  'px-3 py-1.5 rounded-lg border text-sm font-medium',
                  noImagesFilter
                    ? 'bg-red-100 border-red-500 text-red-700'
                    : 'border-dark-300 text-dark-600'
                )}
              >
                Sem Imagens
              </button>
              <button
                onClick={() => {
                  setIncompleteFilter(!incompleteFilter);
                  if (!incompleteFilter) { setLowStockFilter(false); setNoImagesFilter(false); }
                }}
                className={cn(
                  'px-3 py-1.5 rounded-lg border text-sm font-medium',
                  incompleteFilter
                    ? 'bg-yellow-100 border-yellow-500 text-yellow-700'
                    : 'border-dark-300 text-dark-600'
                )}
              >
                Incompletos
              </button>
            </div>

            {activeFiltersCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-sm text-red-500 font-medium"
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}

        {/* Desktop Advanced Filters */}
        {showAdvancedFilters && (
          <div className="hidden lg:block pt-4 border-t border-dark-100 dark:border-dark-800">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                  Categoria
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="input w-full"
                  disabled={lowStockFilter || noImagesFilter || incompleteFilter}
                >
                  <option value="">Todas</option>
                  {categories?.map((cat: any) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-3">
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                  Filtros Rápidos
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setLowStockFilter(!lowStockFilter);
                      if (!lowStockFilter) { setNoImagesFilter(false); setIncompleteFilter(false); }
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-lg border text-sm font-medium',
                      lowStockFilter
                        ? 'bg-orange-100 border-orange-500 text-orange-700'
                        : 'border-dark-300 text-dark-600 hover:bg-dark-50'
                    )}
                  >
                    Estoque Baixo
                  </button>
                  <button
                    onClick={() => {
                      setNoImagesFilter(!noImagesFilter);
                      if (!noImagesFilter) { setLowStockFilter(false); setIncompleteFilter(false); }
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-lg border text-sm font-medium',
                      noImagesFilter
                        ? 'bg-red-100 border-red-500 text-red-700'
                        : 'border-dark-300 text-dark-600 hover:bg-dark-50'
                    )}
                  >
                    Sem Imagens
                  </button>
                  <button
                    onClick={() => {
                      setIncompleteFilter(!incompleteFilter);
                      if (!incompleteFilter) { setLowStockFilter(false); setNoImagesFilter(false); }
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-lg border text-sm font-medium',
                      incompleteFilter
                        ? 'bg-yellow-100 border-yellow-500 text-yellow-700'
                        : 'border-dark-300 text-dark-600 hover:bg-dark-50'
                    )}
                  >
                    Incompletos (&lt;80%)
                  </button>
                </div>
              </div>
            </div>
            {activeFiltersCount > 0 && (
              <div className="flex items-center justify-end mt-4 pt-4 border-t border-dark-100 dark:border-dark-800">
                <button onClick={clearAllFilters} className="text-sm text-red-500 font-medium">
                  Limpar todos os filtros
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-primary-500 animate-spin" />
        </div>
      ) : isError ? (
        <div className="card p-8 text-center">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <p className="text-dark-600 dark:text-dark-400 mb-4">
            {(error as unknown as ApiError)?.message || 'Erro ao carregar produtos'}
          </p>
          <button onClick={() => refetch()} className="btn-secondary">
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar novamente
          </button>
        </div>
      ) : data?.content?.length > 0 ? (
        <>
          {/* Mobile: Cards */}
          <div className="lg:hidden space-y-3">
            {/* Select All */}
            <div className="flex items-center justify-between px-1">
              <button onClick={handleSelectAll} className="flex items-center gap-2 text-sm text-dark-600">
                {allSelected ? <CheckSquare className="w-4 h-4 text-primary-600" /> :
                 someSelected ? <MinusSquare className="w-4 h-4 text-primary-600" /> :
                 <Square className="w-4 h-4" />}
                Selecionar todos
              </button>
              <span className="text-xs text-dark-500">{data.totalElements} produtos</span>
            </div>

            {data.content.map((product: Product) => (
              <ProductCard
                key={product.id}
                product={product}
                isSelected={selectedProducts.has(product.id)}
                onSelect={() => handleSelectProduct(product.id)}
                onDelete={() => handleDelete(product)}
                onDuplicate={() => handleDuplicate(product)}
                isDeleting={deletingId === product.id}
              />
            ))}
          </div>

          {/* Desktop: Table */}
          <div className="hidden lg:block card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-dark-50 dark:bg-dark-800">
                  <tr>
                    <th className="table-header w-10">
                      <button onClick={handleSelectAll} className="p-1 hover:bg-dark-200 dark:hover:bg-dark-700 rounded">
                        {allSelected ? <CheckSquare className="w-4 h-4 text-primary-600" /> :
                         someSelected ? <MinusSquare className="w-4 h-4 text-primary-600" /> :
                         <Square className="w-4 h-4 text-dark-400" />}
                      </button>
                    </th>
                    {isColumnVisible('image') && <th className="table-header w-16">Imagem</th>}
                    {isColumnVisible('name') && <th className="table-header">Produto</th>}
                    {isColumnVisible('sku') && <th className="table-header">SKU</th>}
                    {isColumnVisible('price') && <th className="table-header">Preço</th>}
                    {isColumnVisible('stock') && <th className="table-header">Estoque</th>}
                    {isColumnVisible('status') && <th className="table-header">Status</th>}
                    {isColumnVisible('completeness') && <th className="table-header">Completude</th>}
                    {isColumnVisible('brand') && <th className="table-header">Marca</th>}
                    {isColumnVisible('type') && <th className="table-header">Tipo</th>}
                    {isColumnVisible('categories') && <th className="table-header">Categorias</th>}
                    {isColumnVisible('createdAt') && <th className="table-header">Criado em</th>}
                    <th className="table-header text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100 dark:divide-dark-800">
                  {data.content.map((product: Product) => (
                    <tr
                      key={product.id}
                      className={cn(
                        'hover:bg-dark-50 dark:hover:bg-dark-800/50',
                        selectedProducts.has(product.id) && 'bg-primary-50 dark:bg-primary-900/20'
                      )}
                    >
                      <td className="table-cell">
                        <button onClick={() => handleSelectProduct(product.id)} className="p-1 hover:bg-dark-200 dark:hover:bg-dark-700 rounded">
                          {selectedProducts.has(product.id) ? <CheckSquare className="w-4 h-4 text-primary-600" /> : <Square className="w-4 h-4 text-dark-400" />}
                        </button>
                      </td>
                      {isColumnVisible('image') && (
                        <td className="table-cell">
                          <Link href={`/products/${product.id}`}>
                            {product.mainImageUrl ? (
                              <img src={product.mainImageUrl} alt={product.name} className="w-12 h-12 object-cover rounded-lg border border-dark-200 dark:border-dark-700" />
                            ) : (
                              <div className="w-12 h-12 bg-dark-100 dark:bg-dark-800 rounded-lg border border-dark-200 dark:border-dark-700 flex items-center justify-center">
                                <ImageIcon className="w-5 h-5 text-dark-400" />
                              </div>
                            )}
                          </Link>
                        </td>
                      )}
                      {isColumnVisible('name') && (
                        <td className="table-cell">
                          <Link href={`/products/${product.id}`} className="font-medium text-dark-900 dark:text-white hover:text-primary-600">
                            {product.name}
                          </Link>
                        </td>
                      )}
                      {isColumnVisible('sku') && <td className="table-cell font-mono text-sm">{product.sku}</td>}
                      {isColumnVisible('price') && <td className="table-cell">{formatCurrency(product.price)}</td>}
                      {isColumnVisible('stock') && (
                        <td className="table-cell">
                          <span className={cn('font-medium',
                            product.stockQuantity <= 0 ? 'text-red-600' :
                            product.stockQuantity < 10 ? 'text-orange-600' : 'text-green-600'
                          )}>
                            {product.stockQuantity}
                          </span>
                        </td>
                      )}
                      {isColumnVisible('status') && (
                        <td className="table-cell">
                          <span className={cn('badge', getStatusColor(product.status))}>
                            {getStatusLabel(product.status)}
                          </span>
                        </td>
                      )}
                      {isColumnVisible('completeness') && (
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-dark-200 dark:bg-dark-700 rounded-full overflow-hidden">
                              <div
                                className={cn('h-full rounded-full',
                                  product.completenessScore >= 80 ? 'bg-green-500' :
                                  product.completenessScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                )}
                                style={{ width: `${product.completenessScore}%` }}
                              />
                            </div>
                            <span className="text-sm text-dark-600 dark:text-dark-400">{product.completenessScore}%</span>
                          </div>
                        </td>
                      )}
                      {isColumnVisible('brand') && <td className="table-cell text-dark-600 dark:text-dark-400">{product.brand || '-'}</td>}
                      {isColumnVisible('type') && <td className="table-cell"><span className="badge badge-default">{product.type || 'SIMPLE'}</span></td>}
                      {isColumnVisible('categories') && (
                        <td className="table-cell">
                          {(product.categories?.length ?? 0) > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {product.categories?.slice(0, 2).map((cat: any) => (
                                <span key={cat.id} className="text-xs bg-dark-100 dark:bg-dark-800 px-2 py-0.5 rounded">{cat.name}</span>
                              ))}
                              {(product.categories?.length ?? 0) > 2 && <span className="text-xs text-dark-500">+{(product.categories?.length ?? 0) - 2}</span>}
                            </div>
                          ) : <span className="text-dark-400">-</span>}
                        </td>
                      )}
                      {isColumnVisible('createdAt') && (
                        <td className="table-cell text-dark-600 dark:text-dark-400 text-sm">
                          {product.createdAt ? new Date(product.createdAt).toLocaleDateString('pt-BR') : '-'}
                        </td>
                      )}
                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/products/${product.id}`} className="p-2 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg" title="Ver">
                            <Eye className="w-4 h-4 text-dark-500" />
                          </Link>
                          <Link href={`/products/${product.id}/edit`} className="p-2 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg" title="Editar">
                            <Edit className="w-4 h-4 text-dark-500" />
                          </Link>
                          <button onClick={() => handleDuplicate(product)} className="p-2 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg" title="Duplicar">
                            <Copy className="w-4 h-4 text-primary-500" />
                          </button>
                          <button
                            onClick={() => handleDelete(product)}
                            disabled={deletingId === product.id}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50"
                            title="Excluir"
                          >
                            {deletingId === product.id ? <Loader2 className="w-4 h-4 text-red-500 animate-spin" /> : <Trash2 className="w-4 h-4 text-red-500" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination - Responsivo */}
          {data && !data.empty && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
              <p className="text-xs sm:text-sm text-dark-500 dark:text-dark-400 order-2 sm:order-1">
                {data.number * data.size + 1} - {Math.min((data.number + 1) * data.size, data.totalElements)} de {data.totalElements}
              </p>
              <div className="flex items-center gap-2 order-1 sm:order-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={data.first}
                  className="btn-secondary p-2 disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-dark-600 dark:text-dark-300 min-w-[80px] text-center">
                  {data.number + 1} / {data.totalPages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={data.last}
                  className="btn-secondary p-2 disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="card p-8 text-center text-dark-500 dark:text-dark-400">
          <Package className="w-12 h-12 mx-auto mb-3 text-dark-300" />
          <p>Nenhum produto encontrado</p>
          <Link href="/products/new" className="btn-primary mt-4 inline-flex">
            <Plus className="w-4 h-4 mr-2" />
            Criar primeiro produto
          </Link>
        </div>
      )}

      {/* Bulk Edit Modal */}
      {showBulkEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 lg:p-6 border-b border-dark-200 dark:border-dark-700">
              <h2 className="text-lg lg:text-xl font-semibold text-dark-900 dark:text-white">
                Edição em Massa
              </h2>
              <p className="text-sm text-dark-500 mt-1">{selectedProducts.size} produto(s)</p>
            </div>
            <div className="p-4 lg:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">Campo</label>
                <select
                  value={bulkEditField}
                  onChange={(e) => { setBulkEditField(e.target.value); setBulkEditValue(''); }}
                  className="input w-full"
                >
                  <option value="">Selecione...</option>
                  {bulkEditFields.map((field) => (
                    <option key={field.value} value={field.value}>{field.label}</option>
                  ))}
                </select>
              </div>
              {selectedField && (
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">Novo valor</label>
                  {selectedField.type === 'select' ? (
                    <select value={bulkEditValue} onChange={(e) => setBulkEditValue(e.target.value)} className="input w-full">
                      <option value="">Selecione...</option>
                      {selectedField.options?.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  ) : selectedField.type === 'boolean' ? (
                    <select value={bulkEditValue} onChange={(e) => setBulkEditValue(e.target.value)} className="input w-full">
                      <option value="">Selecione...</option>
                      <option value="true">Sim</option>
                      <option value="false">Não</option>
                    </select>
                  ) : selectedField.type === 'number' ? (
                    <input type="number" value={bulkEditValue} onChange={(e) => setBulkEditValue(e.target.value)} className="input w-full" step={selectedField.value === 'price' ? '0.01' : '1'} />
                  ) : (
                    <input type="text" value={bulkEditValue} onChange={(e) => setBulkEditValue(e.target.value)} className="input w-full" />
                  )}
                </div>
              )}
            </div>
            <div className="p-4 lg:p-6 border-t border-dark-200 dark:border-dark-700 flex justify-end gap-3">
              <button
                onClick={() => { setShowBulkEditModal(false); setBulkEditField(''); setBulkEditValue(''); }}
                className="px-4 py-2 text-dark-700 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkUpdate}
                disabled={bulkUpdateMutation.isPending || !bulkEditField || bulkEditValue === ''}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg disabled:opacity-50"
              >
                {bulkUpdateMutation.isPending ? 'Atualizando...' : 'Atualizar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Modal */}
      {showDuplicateModal && duplicatingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 lg:p-6 border-b border-dark-200 dark:border-dark-700">
              <h2 className="text-lg lg:text-xl font-semibold text-dark-900 dark:text-white flex items-center gap-2">
                <Copy className="w-5 h-5 text-primary-500" />
                Duplicar Produto
              </h2>
              <p className="text-sm text-dark-500 mt-1 truncate">
                <strong>{duplicatingProduct.name}</strong>
              </p>
            </div>
            <div className="p-4 lg:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">Novo SKU *</label>
                <input
                  type="text"
                  value={duplicateOptions.newSku}
                  onChange={(e) => setDuplicateOptions(prev => ({ ...prev, newSku: e.target.value }))}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">Novo Nome</label>
                <input
                  type="text"
                  value={duplicateOptions.newName}
                  onChange={(e) => setDuplicateOptions(prev => ({ ...prev, newName: e.target.value }))}
                  className="input w-full"
                />
              </div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={duplicateOptions.copyImages}
                  onChange={(e) => setDuplicateOptions(prev => ({ ...prev, copyImages: e.target.checked }))}
                  className="w-4 h-4 rounded border-dark-300 text-primary-600"
                />
                <span className="text-sm">Copiar imagens</span>
              </label>
            </div>
            <div className="p-4 lg:p-6 border-t border-dark-200 dark:border-dark-700 flex justify-end gap-3">
              <button
                onClick={() => { setShowDuplicateModal(false); setDuplicatingProduct(null); }}
                className="px-4 py-2 text-dark-700 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleDuplicateConfirm}
                disabled={duplicateMutation.isPending || !duplicateOptions.newSku.trim()}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {duplicateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                Duplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
