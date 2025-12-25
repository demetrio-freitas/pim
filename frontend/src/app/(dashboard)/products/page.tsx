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
  { value: '', label: 'Todos os Tipos', icon: '📦' },
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
      // Merge with defaults to handle new columns
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
  const visibleColumnsCount = columns.filter(c => c.visible).length + 2; // +2 for checkbox and actions

  // Get categories for filter dropdown
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
  });

  // Determine which endpoint to use based on special filters
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
    onError: (error: ApiError) => {
      showError(error);
    },
    onSettled: () => {
      setDeletingId(null);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (productIds: string[]) => api.bulkDeleteProducts(productIds),
    onSuccess: (result) => {
      showSuccess(`${result.deletedCount || selectedProducts.size} produtos excluídos com sucesso`);
      setSelectedProducts(new Set());
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: ApiError) => showError(error),
  });

  const bulkPublishMutation = useMutation({
    mutationFn: (productIds: string[]) => api.bulkPublishProducts(productIds),
    onSuccess: (result) => {
      showSuccess(`${result.updatedCount || selectedProducts.size} produtos publicados com sucesso`);
      setSelectedProducts(new Set());
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: ApiError) => showError(error),
  });

  const bulkUnpublishMutation = useMutation({
    mutationFn: (productIds: string[]) => api.bulkUnpublishProducts(productIds),
    onSuccess: (result) => {
      showSuccess(`${result.updatedCount || selectedProducts.size} produtos despublicados com sucesso`);
      setSelectedProducts(new Set());
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: ApiError) => showError(error),
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: ({ productIds, updates }: { productIds: string[]; updates: Record<string, any> }) =>
      api.bulkUpdateProducts(productIds, updates),
    onSuccess: (result) => {
      showSuccess(`${result.updatedCount || selectedProducts.size} produtos atualizados com sucesso`);
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
      showSuccess(`Produto duplicado com sucesso! Novo SKU: ${newProduct.sku}`);
      setShowDuplicateModal(false);
      setDuplicatingProduct(null);
      setDuplicateOptions({ newSku: '', newName: '', copyImages: true });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: ApiError) => showError(error),
  });

  const handleDelete = (product: Product) => {
    if (confirm(`Deseja realmente excluir o produto "${product.name}"?`)) {
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

    if (allSelected) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(allIds));
    }
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
    if (confirm(`Deseja realmente excluir ${selectedProducts.size} produtos?`)) {
      bulkDeleteMutation.mutate(Array.from(selectedProducts));
    }
  };

  const handleBulkPublish = () => {
    if (confirm(`Deseja publicar ${selectedProducts.size} produtos?`)) {
      bulkPublishMutation.mutate(Array.from(selectedProducts));
    }
  };

  const handleBulkUnpublish = () => {
    if (confirm(`Deseja despublicar ${selectedProducts.size} produtos?`)) {
      bulkUnpublishMutation.mutate(Array.from(selectedProducts));
    }
  };

  const handleBulkUpdate = () => {
    if (!bulkEditField || bulkEditValue === '') return;

    const updates: Record<string, any> = {};

    switch (bulkEditField) {
      case 'status':
        updates.status = bulkEditValue;
        break;
      case 'price':
        updates.price = parseFloat(bulkEditValue);
        break;
      case 'stockQuantity':
        updates.stockQuantity = parseInt(bulkEditValue);
        break;
      case 'brand':
        updates.brand = bulkEditValue;
        break;
      case 'vendor':
        updates.vendor = bulkEditValue;
        break;
      case 'taxable':
        updates.taxable = bulkEditValue === 'true';
        break;
      case 'requiresShipping':
        updates.requiresShipping = bulkEditValue === 'true';
        break;
      case 'inventoryPolicy':
        updates.inventoryPolicy = bulkEditValue;
        break;
      case 'weight':
        updates.weight = parseFloat(bulkEditValue);
        break;
      case 'weightUnit':
        updates.weightUnit = bulkEditValue;
        break;
      case 'isFeatured':
        updates.isFeatured = bulkEditValue === 'true';
        break;
      case 'isNew':
        updates.isNew = bulkEditValue === 'true';
        break;
      case 'isOnSale':
        updates.isOnSale = bulkEditValue === 'true';
        break;
      default:
        updates[bulkEditField] = bulkEditValue;
    }

    bulkUpdateMutation.mutate({
      productIds: Array.from(selectedProducts),
      updates,
    });
  };

  const allSelected = data?.content?.length > 0 && data.content.every((p: Product) => selectedProducts.has(p.id));
  const someSelected = data?.content?.some((p: Product) => selectedProducts.has(p.id)) && !allSelected;

  const bulkEditFields = [
    { value: 'status', label: 'Status', type: 'select', options: statusOptions.filter(s => s.value) },
    { value: 'price', label: 'Preço', type: 'number' },
    { value: 'stockQuantity', label: 'Quantidade em Estoque', type: 'number' },
    { value: 'brand', label: 'Marca', type: 'text' },
    { value: 'vendor', label: 'Fornecedor', type: 'text' },
    { value: 'taxable', label: 'Tributável', type: 'boolean' },
    { value: 'requiresShipping', label: 'Requer Frete', type: 'boolean' },
    { value: 'inventoryPolicy', label: 'Política de Estoque', type: 'select', options: [
      { value: 'deny', label: 'Negar compra' },
      { value: 'continue', label: 'Permitir compra' },
    ]},
    { value: 'weight', label: 'Peso', type: 'number' },
    { value: 'weightUnit', label: 'Unidade de Peso', type: 'select', options: [
      { value: 'KG', label: 'Quilogramas' },
      { value: 'G', label: 'Gramas' },
      { value: 'LB', label: 'Libras' },
      { value: 'OZ', label: 'Onças' },
    ]},
    { value: 'isFeatured', label: 'Destaque', type: 'boolean' },
    { value: 'isNew', label: 'Novo', type: 'boolean' },
    { value: 'isOnSale', label: 'Em Promoção', type: 'boolean' },
  ];

  const selectedField = bulkEditFields.find(f => f.value === bulkEditField);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white">Produtos</h1>
          <p className="text-dark-500 dark:text-dark-400 mt-1">
            Gerencie seu catálogo de produtos
          </p>
        </div>
        <Link href="/products/new" className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Novo Produto
        </Link>
      </div>

      {/* Bulk Actions Bar */}
      {selectedProducts.size > 0 && (
        <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-primary-600" />
            <span className="text-primary-700 dark:text-primary-300 font-medium">
              {selectedProducts.size} produto(s) selecionado(s)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBulkEditModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-dark-700 text-dark-700 dark:text-dark-200 border border-dark-300 dark:border-dark-600 rounded-lg hover:bg-dark-50 dark:hover:bg-dark-600"
            >
              <Edit className="w-4 h-4" />
              Editar em Massa
            </button>
            <button
              onClick={handleBulkPublish}
              disabled={bulkPublishMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              Publicar
            </button>
            <button
              onClick={handleBulkUnpublish}
              disabled={bulkUnpublishMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50"
            >
              <Archive className="w-4 h-4" />
              Despublicar
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </button>
            <button
              onClick={() => setSelectedProducts(new Set())}
              className="p-1.5 text-dark-500 hover:text-dark-700 dark:hover:text-dark-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Product Type Tabs */}
      <div className="flex border-b border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-900 rounded-t-xl overflow-hidden">
        {productTypeOptions.map((type) => (
          <button
            key={type.value}
            onClick={() => {
              setProductType(type.value);
              setPage(0);
              // Clear special filters when changing type
              if (lowStockFilter || noImagesFilter || incompleteFilter) {
                setLowStockFilter(false);
                setNoImagesFilter(false);
                setIncompleteFilter(false);
              }
            }}
            className={cn(
              'flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors',
              productType === type.value
                ? 'border-primary-500 text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                : 'border-transparent text-dark-500 dark:text-dark-400 hover:text-dark-700 dark:hover:text-dark-300 hover:bg-dark-50 dark:hover:bg-dark-800'
            )}
          >
            <span>{type.icon}</span>
            {type.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-4 rounded-t-none border-t-0">
        <div className="flex flex-col sm:flex-row gap-4">
          <SearchAutocomplete
            value={search}
            onChange={setSearch}
            onSearch={(value) => {
              setSearch(value);
              setPage(0);
            }}
            onSelectSuggestion={(suggestion) => {
              if (suggestion.type === 'category') {
                setCategoryId(suggestion.id);
                setSearch('');
                setPage(0);
              } else if (suggestion.type === 'product') {
                setSearch(suggestion.text);
                setPage(0);
              } else if (suggestion.type === 'brand') {
                setSearch(suggestion.text);
                setPage(0);
              }
            }}
            placeholder="Buscar por nome, SKU, descrição..."
            disabled={lowStockFilter || noImagesFilter || incompleteFilter}
          />
          <div className="flex gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProductStatus | '')}
              className="input w-48"
              disabled={lowStockFilter || noImagesFilter || incompleteFilter}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
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
              <ChevronDown className={cn('w-4 h-4 transition-transform', showAdvancedFilters && 'rotate-180')} />
            </button>
            <div className="relative" ref={columnConfigRef}>
              <button
                onClick={() => setShowColumnConfig(!showColumnConfig)}
                className="btn-secondary flex items-center gap-2"
                title="Configurar colunas"
              >
                <Settings2 className="w-4 h-4" />
                Colunas
              </button>
              {showColumnConfig && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-dark-800 rounded-lg shadow-lg border border-dark-200 dark:border-dark-700 z-50">
                  <div className="p-3 border-b border-dark-200 dark:border-dark-700 flex items-center justify-between">
                    <span className="font-medium text-dark-900 dark:text-white">Colunas Visíveis</span>
                    <button
                      onClick={resetColumns}
                      className="text-xs text-primary-600 hover:text-primary-700"
                    >
                      Restaurar
                    </button>
                  </div>
                  <div className="p-2 max-h-64 overflow-y-auto">
                    {columns.map((col) => (
                      <label
                        key={col.id}
                        className={cn(
                          'flex items-center gap-2 px-2 py-1.5 rounded hover:bg-dark-50 dark:hover:bg-dark-700 cursor-pointer',
                          col.required && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={col.visible}
                          onChange={() => toggleColumn(col.id)}
                          disabled={col.required}
                          className="rounded border-dark-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-dark-700 dark:text-dark-300">{col.label}</span>
                        {col.required && (
                          <span className="text-xs text-dark-400 ml-auto">(obrigatório)</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Sort Control */}
            <SortControl
              value={sortBy}
              onChange={(value) => {
                setSortBy(value);
                setPage(0);
              }}
              disabled={lowStockFilter || noImagesFilter || incompleteFilter}
            />
            {/* Saved Filters */}
            <SavedFiltersDropdown<ProductFiltersState>
              storageKey="pim_product_filters"
              currentFilters={{
                search,
                status,
                categoryId,
                productType,
                lowStockFilter,
                noImagesFilter,
                incompleteFilter,
              }}
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

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="pt-4 border-t border-dark-100 dark:border-dark-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Category Filter */}
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
                  <option value="">Todas as categorias</option>
                  {categories?.map((cat: any) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Filters */}
              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                  Filtros Rápidos
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setLowStockFilter(!lowStockFilter);
                      if (!lowStockFilter) {
                        setNoImagesFilter(false);
                        setIncompleteFilter(false);
                      }
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors',
                      lowStockFilter
                        ? 'bg-orange-100 border-orange-500 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                        : 'border-dark-300 dark:border-dark-600 text-dark-600 dark:text-dark-400 hover:bg-dark-50 dark:hover:bg-dark-700'
                    )}
                  >
                    Estoque Baixo
                  </button>
                  <button
                    onClick={() => {
                      setNoImagesFilter(!noImagesFilter);
                      if (!noImagesFilter) {
                        setLowStockFilter(false);
                        setIncompleteFilter(false);
                      }
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors',
                      noImagesFilter
                        ? 'bg-red-100 border-red-500 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'border-dark-300 dark:border-dark-600 text-dark-600 dark:text-dark-400 hover:bg-dark-50 dark:hover:bg-dark-700'
                    )}
                  >
                    Sem Imagens
                  </button>
                  <button
                    onClick={() => {
                      setIncompleteFilter(!incompleteFilter);
                      if (!incompleteFilter) {
                        setLowStockFilter(false);
                        setNoImagesFilter(false);
                      }
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors',
                      incompleteFilter
                        ? 'bg-yellow-100 border-yellow-500 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'border-dark-300 dark:border-dark-600 text-dark-600 dark:text-dark-400 hover:bg-dark-50 dark:hover:bg-dark-700'
                    )}
                  >
                    Incompletos (&lt;80%)
                  </button>
                </div>
              </div>
            </div>

            {/* Active Filters Summary */}
            {activeFiltersCount > 0 && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-dark-100 dark:border-dark-800">
                <span className="text-sm text-dark-500 dark:text-dark-400">Filtros ativos:</span>
                <div className="flex flex-wrap gap-2">
                  {status && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-dark-100 dark:bg-dark-700 rounded text-sm">
                      Status: {statusOptions.find(s => s.value === status)?.label}
                      <button onClick={() => setStatus('')} className="hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {categoryId && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-dark-100 dark:bg-dark-700 rounded text-sm">
                      Categoria: {categories?.find((c: any) => c.id === categoryId)?.name}
                      <button onClick={() => setCategoryId('')} className="hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {lowStockFilter && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded text-sm">
                      Estoque Baixo
                      <button onClick={() => setLowStockFilter(false)} className="hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {noImagesFilter && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-sm">
                      Sem Imagens
                      <button onClick={() => setNoImagesFilter(false)} className="hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {incompleteFilter && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded text-sm">
                      Incompletos
                      <button onClick={() => setIncompleteFilter(false)} className="hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
                <button
                  onClick={clearAllFilters}
                  className="ml-auto text-sm text-red-500 hover:text-red-600 font-medium"
                >
                  Limpar todos
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-50 dark:bg-dark-800">
              <tr>
                <th className="table-header w-10">
                  <button
                    onClick={handleSelectAll}
                    className="p-1 hover:bg-dark-200 dark:hover:bg-dark-700 rounded"
                  >
                    {allSelected ? (
                      <CheckSquare className="w-4 h-4 text-primary-600" />
                    ) : someSelected ? (
                      <MinusSquare className="w-4 h-4 text-primary-600" />
                    ) : (
                      <Square className="w-4 h-4 text-dark-400" />
                    )}
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
              {isLoading ? (
                <tr>
                  <td colSpan={visibleColumnsCount} className="text-center py-12">
                    <Loader2 className="h-8 w-8 text-primary-500 mx-auto animate-spin" />
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={visibleColumnsCount} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <AlertCircle className="h-10 w-10 text-red-500" />
                      <p className="text-dark-600 dark:text-dark-400">
                        {(error as unknown as ApiError)?.message || 'Erro ao carregar produtos'}
                      </p>
                      <button
                        onClick={() => refetch()}
                        className="btn-secondary flex items-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Tentar novamente
                      </button>
                    </div>
                  </td>
                </tr>
              ) : data?.content?.length > 0 ? (
                data.content.map((product: Product) => (
                  <tr
                    key={product.id}
                    className={cn(
                      'hover:bg-dark-50 dark:hover:bg-dark-800/50',
                      selectedProducts.has(product.id) && 'bg-primary-50 dark:bg-primary-900/20'
                    )}
                  >
                    <td className="table-cell">
                      <button
                        onClick={() => handleSelectProduct(product.id)}
                        className="p-1 hover:bg-dark-200 dark:hover:bg-dark-700 rounded"
                      >
                        {selectedProducts.has(product.id) ? (
                          <CheckSquare className="w-4 h-4 text-primary-600" />
                        ) : (
                          <Square className="w-4 h-4 text-dark-400" />
                        )}
                      </button>
                    </td>
                    {isColumnVisible('image') && (
                      <td className="table-cell">
                        <Link href={`/products/${product.id}`}>
                          {product.mainImageUrl ? (
                            <img
                              src={product.mainImageUrl}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded-lg border border-dark-200 dark:border-dark-700"
                            />
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
                        <Link
                          href={`/products/${product.id}`}
                          className="font-medium text-dark-900 dark:text-white hover:text-primary-600"
                        >
                          {product.name}
                        </Link>
                      </td>
                    )}
                    {isColumnVisible('sku') && (
                      <td className="table-cell font-mono text-sm">{product.sku}</td>
                    )}
                    {isColumnVisible('price') && (
                      <td className="table-cell">{formatCurrency(product.price)}</td>
                    )}
                    {isColumnVisible('stock') && (
                      <td className="table-cell">
                        <span className={cn(
                          'font-medium',
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
                          <span className="text-sm text-dark-600 dark:text-dark-400">
                            {product.completenessScore}%
                          </span>
                        </div>
                      </td>
                    )}
                    {isColumnVisible('brand') && (
                      <td className="table-cell text-dark-600 dark:text-dark-400">
                        {product.brand || '-'}
                      </td>
                    )}
                    {isColumnVisible('type') && (
                      <td className="table-cell">
                        <span className="badge badge-default">{product.type || 'SIMPLE'}</span>
                      </td>
                    )}
                    {isColumnVisible('categories') && (
                      <td className="table-cell">
                        {(product.categories?.length ?? 0) > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {product.categories?.slice(0, 2).map((cat: any) => (
                              <span key={cat.id} className="text-xs bg-dark-100 dark:bg-dark-800 px-2 py-0.5 rounded">
                                {cat.name}
                              </span>
                            ))}
                            {(product.categories?.length ?? 0) > 2 && (
                              <span className="text-xs text-dark-500">+{(product.categories?.length ?? 0) - 2}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-dark-400">-</span>
                        )}
                      </td>
                    )}
                    {isColumnVisible('createdAt') && (
                      <td className="table-cell text-dark-600 dark:text-dark-400 text-sm">
                        {product.createdAt ? new Date(product.createdAt).toLocaleDateString('pt-BR') : '-'}
                      </td>
                    )}
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/products/${product.id}`}
                          className="p-2 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
                          title="Ver"
                        >
                          <Eye className="w-4 h-4 text-dark-500" />
                        </Link>
                        <Link
                          href={`/products/${product.id}/edit`}
                          className="p-2 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4 text-dark-500" />
                        </Link>
                        <button
                          onClick={() => handleDuplicate(product)}
                          className="p-2 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg"
                          title="Duplicar"
                        >
                          <Copy className="w-4 h-4 text-primary-500" />
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          disabled={deletingId === product.id}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50"
                          title="Excluir"
                        >
                          {deletingId === product.id ? (
                            <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-red-500" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={visibleColumnsCount} className="text-center py-12 text-dark-500 dark:text-dark-400">
                    Nenhum produto encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && !data.empty && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-dark-100 dark:border-dark-800">
            <p className="text-sm text-dark-500 dark:text-dark-400">
              Mostrando {data.number * data.size + 1} -{' '}
              {Math.min((data.number + 1) * data.size, data.totalElements)} de{' '}
              {data.totalElements} resultados
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={data.first}
                className="btn-secondary p-2 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-dark-600 dark:text-dark-300">
                Página {data.number + 1} de {data.totalPages}
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
      </div>

      {/* Bulk Edit Modal */}
      {showBulkEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-dark-200 dark:border-dark-700">
              <h2 className="text-xl font-semibold text-dark-900 dark:text-white">
                Edição em Massa
              </h2>
              <p className="text-sm text-dark-500 mt-1">
                {selectedProducts.size} produto(s) selecionado(s)
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                  Campo a atualizar
                </label>
                <select
                  value={bulkEditField}
                  onChange={(e) => {
                    setBulkEditField(e.target.value);
                    setBulkEditValue('');
                  }}
                  className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700"
                >
                  <option value="">Selecione um campo...</option>
                  {bulkEditFields.map((field) => (
                    <option key={field.value} value={field.value}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </div>

              {selectedField && (
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">
                    Novo valor
                  </label>
                  {selectedField.type === 'select' ? (
                    <select
                      value={bulkEditValue}
                      onChange={(e) => setBulkEditValue(e.target.value)}
                      className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700"
                    >
                      <option value="">Selecione...</option>
                      {selectedField.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : selectedField.type === 'boolean' ? (
                    <select
                      value={bulkEditValue}
                      onChange={(e) => setBulkEditValue(e.target.value)}
                      className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700"
                    >
                      <option value="">Selecione...</option>
                      <option value="true">Sim</option>
                      <option value="false">Não</option>
                    </select>
                  ) : selectedField.type === 'number' ? (
                    <input
                      type="number"
                      value={bulkEditValue}
                      onChange={(e) => setBulkEditValue(e.target.value)}
                      className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700"
                      step={selectedField.value === 'price' || selectedField.value === 'weight' ? '0.01' : '1'}
                    />
                  ) : (
                    <input
                      type="text"
                      value={bulkEditValue}
                      onChange={(e) => setBulkEditValue(e.target.value)}
                      className="w-full px-3 py-2 border border-dark-300 dark:border-dark-600 rounded-lg dark:bg-dark-700"
                    />
                  )}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-dark-200 dark:border-dark-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowBulkEditModal(false);
                  setBulkEditField('');
                  setBulkEditValue('');
                }}
                className="px-4 py-2 text-dark-700 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkUpdate}
                disabled={bulkUpdateMutation.isPending || !bulkEditField || bulkEditValue === ''}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg disabled:opacity-50"
              >
                {bulkUpdateMutation.isPending ? 'Atualizando...' : 'Atualizar Produtos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Product Modal */}
      {showDuplicateModal && duplicatingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-dark-200 dark:border-dark-700">
              <h2 className="text-xl font-semibold text-dark-900 dark:text-white flex items-center gap-2">
                <Copy className="w-5 h-5 text-primary-500" />
                Duplicar Produto
              </h2>
              <p className="text-sm text-dark-500 mt-1">
                Criando cópia de: <strong>{duplicatingProduct.name}</strong>
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
                  id="copyImages"
                  checked={duplicateOptions.copyImages}
                  onChange={(e) => setDuplicateOptions(prev => ({ ...prev, copyImages: e.target.checked }))}
                  className="w-4 h-4 rounded border-dark-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="copyImages" className="text-sm text-dark-700 dark:text-dark-300">
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
                  setDuplicatingProduct(null);
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
