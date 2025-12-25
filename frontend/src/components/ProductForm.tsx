'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Package,
  DollarSign,
  Warehouse,
  Search,
  Image as ImageIcon,
  Link2,
  ShoppingBag,
  Globe,
  Truck,
  Tag,
  Info,
  ChevronRight,
  Plus,
  X,
  AlertCircle,
  CheckCircle,
  Upload,
  Loader2,
  Trash2,
  Star,
  GripVertical,
  ExternalLink,
} from 'lucide-react';
import { ImageUrlUploader } from './ImageUrlUploader';
import { AIDescriptionGenerator } from './AIDescriptionGenerator';
import { NCMSuggester } from './NCMSuggester';
import { TagSuggester } from './TagSuggester';
import { SEOOptimizer } from './SEOOptimizer';
import { SpedItemTypeSelector } from './SpedItemTypeSelector';
import { cn } from '@/lib/utils';
import { SpedItemType, ProductType } from '@/types';

// Storage key for required fields configuration
const REQUIRED_FIELDS_STORAGE_KEY = 'pim_required_fields';

// Get stored required fields configuration
const getRequiredFieldsConfig = (): Record<string, boolean> => {
  if (typeof window === 'undefined') return { sku: true, name: true };
  const stored = localStorage.getItem(REQUIRED_FIELDS_STORAGE_KEY);
  if (stored) {
    try {
      return { sku: true, name: true, ...JSON.parse(stored) };
    } catch {
      return { sku: true, name: true };
    }
  }
  return { sku: true, name: true };
};

// Tab definitions
const tabs = [
  { id: 'general', label: 'Geral', icon: Package },
  { id: 'prices', label: 'Preços', icon: DollarSign },
  { id: 'inventory', label: 'Estoque', icon: Warehouse },
  { id: 'shipping', label: 'Envio', icon: Truck },
  { id: 'seo', label: 'SEO', icon: Search },
  { id: 'media', label: 'Mídia', icon: ImageIcon },
  { id: 'integrations', label: 'Integrações', icon: Link2 },
];

// Product types
const productTypes = [
  { value: 'SIMPLE', label: 'Simples' },
  { value: 'CONFIGURABLE', label: 'Configurável' },
  { value: 'VIRTUAL', label: 'Virtual' },
  { value: 'BUNDLE', label: 'Bundle' },
  { value: 'GROUPED', label: 'Agrupado' },
];

// Product conditions
const productConditions = [
  { value: 'NEW', label: 'Novo' },
  { value: 'REFURBISHED', label: 'Recondicionado' },
  { value: 'USED', label: 'Usado' },
];

// Age groups
const ageGroups = [
  { value: '', label: 'Selecione...' },
  { value: 'NEWBORN', label: 'Recém-nascido' },
  { value: 'INFANT', label: 'Bebê' },
  { value: 'TODDLER', label: 'Criança pequena' },
  { value: 'KIDS', label: 'Crianças' },
  { value: 'ADULT', label: 'Adulto' },
];

// Genders
const genders = [
  { value: '', label: 'Selecione...' },
  { value: 'MALE', label: 'Masculino' },
  { value: 'FEMALE', label: 'Feminino' },
  { value: 'UNISEX', label: 'Unissex' },
];

// Weight units
const weightUnits = [
  { value: 'KG', label: 'Quilogramas (kg)' },
  { value: 'G', label: 'Gramas (g)' },
  { value: 'LB', label: 'Libras (lb)' },
  { value: 'OZ', label: 'Onças (oz)' },
];

// Dimension units
const dimensionUnits = [
  { value: 'CM', label: 'Centímetros (cm)' },
  { value: 'MM', label: 'Milímetros (mm)' },
  { value: 'IN', label: 'Polegadas (in)' },
  { value: 'M', label: 'Metros (m)' },
];

// Inventory policies
const inventoryPolicies = [
  { value: 'DENY', label: 'Negar venda (quando sem estoque)' },
  { value: 'CONTINUE', label: 'Permitir overselling' },
];

// ML Listing types
const mlListingTypes = [
  { value: '', label: 'Selecione...' },
  { value: 'GOLD_SPECIAL', label: 'Clássico com destaque' },
  { value: 'GOLD_PRO', label: 'Premium' },
  { value: 'GOLD', label: 'Clássico' },
  { value: 'SILVER', label: 'Grátis (exposição média)' },
  { value: 'BRONZE', label: 'Grátis (exposição baixa)' },
  { value: 'FREE', label: 'Grátis' },
];

// Amazon fulfillment channels
const amazonFulfillmentChannels = [
  { value: '', label: 'Selecione...' },
  { value: 'FBA', label: 'FBA (Fulfilled by Amazon)' },
  { value: 'FBM', label: 'FBM (Fulfilled by Merchant)' },
];

export interface ProductFormData {
  // General
  sku: string;
  name: string;
  description: string;
  shortDescription: string;
  type: string;
  brand: string;
  vendor: string;
  manufacturer: string;
  productType: string;
  tags: string;
  productCondition: string;

  // Google Shopping / Global
  gtin: string;
  mpn: string;
  barcode: string;
  ncm: string;
  spedItemType: string;
  googleCategory: string;
  googleCategoryId: string;
  ageGroup: string;
  gender: string;
  color: string;
  size: string;
  sizeType: string;
  sizeSystem: string;
  material: string;
  pattern: string;

  // Prices
  price: string;
  costPrice: string;
  compareAtPrice: string;
  taxable: boolean;

  // Inventory
  stockQuantity: string;
  isInStock: boolean;
  inventoryPolicy: string;
  inventoryManagement: string;
  minOrderQty: string;
  maxOrderQty: string;
  orderQtyStep: string;

  // Shipping
  weight: string;
  weightUnit: string;
  length: string;
  width: string;
  height: string;
  dimensionUnit: string;
  requiresShipping: boolean;
  fulfillmentService: string;
  countryOfOrigin: string;
  hsCode: string;

  // SEO
  urlKey: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;

  // Flags
  isFeatured: boolean;
  isNew: boolean;
  isOnSale: boolean;
  saleStartDate: string;
  saleEndDate: string;

  // Warranty
  warranty: string;
  warrantyType: string;

  // Mercado Livre
  mlListingType: string;
  mlShippingMode: string;
  mlFreeShipping: boolean;
  mlCategoryId: string;

  // Amazon
  asin: string;
  amazonBulletPoints: string;
  amazonSearchTerms: string;
  amazonFulfillmentChannel: string;
  amazonProductType: string;
  amazonBrowseNodeId: string;

  // WooCommerce
  externalUrl: string;
  buttonText: string;
  purchaseNote: string;
  downloadLimit: string;
  downloadExpiry: string;
}

interface ProductFormProps {
  initialData?: Partial<ProductFormData>;
  onSubmit: (data: ProductFormData) => void;
  isLoading?: boolean;
  errors?: Record<string, string>;
  mode: 'create' | 'edit';
}

const defaultFormData: ProductFormData = {
  sku: '',
  name: '',
  description: '',
  shortDescription: '',
  type: 'SIMPLE',
  brand: '',
  vendor: '',
  manufacturer: '',
  productType: '',
  tags: '',
  productCondition: 'NEW',
  gtin: '',
  mpn: '',
  barcode: '',
  ncm: '',
  spedItemType: '',
  googleCategory: '',
  googleCategoryId: '',
  ageGroup: '',
  gender: '',
  color: '',
  size: '',
  sizeType: '',
  sizeSystem: '',
  material: '',
  pattern: '',
  price: '',
  costPrice: '',
  compareAtPrice: '',
  taxable: true,
  stockQuantity: '0',
  isInStock: true,
  inventoryPolicy: 'DENY',
  inventoryManagement: '',
  minOrderQty: '1',
  maxOrderQty: '',
  orderQtyStep: '1',
  weight: '',
  weightUnit: 'KG',
  length: '',
  width: '',
  height: '',
  dimensionUnit: 'CM',
  requiresShipping: true,
  fulfillmentService: 'manual',
  countryOfOrigin: 'BR',
  hsCode: '',
  urlKey: '',
  metaTitle: '',
  metaDescription: '',
  metaKeywords: '',
  isFeatured: false,
  isNew: false,
  isOnSale: false,
  saleStartDate: '',
  saleEndDate: '',
  warranty: '',
  warrantyType: '',
  mlListingType: '',
  mlShippingMode: '',
  mlFreeShipping: false,
  mlCategoryId: '',
  asin: '',
  amazonBulletPoints: '',
  amazonSearchTerms: '',
  amazonFulfillmentChannel: '',
  amazonProductType: '',
  amazonBrowseNodeId: '',
  externalUrl: '',
  buttonText: '',
  purchaseNote: '',
  downloadLimit: '',
  downloadExpiry: '',
};

export function ProductForm({ initialData, onSubmit, isLoading, errors = {}, mode }: ProductFormProps) {
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState<ProductFormData>({ ...defaultFormData, ...initialData });
  const [tagInput, setTagInput] = useState('');
  const [requiredFields, setRequiredFields] = useState<Record<string, boolean>>({ sku: true, name: true });
  const [imageError, setImageError] = useState<string | null>(null);

  // Load required fields configuration on mount
  useEffect(() => {
    setRequiredFields(getRequiredFieldsConfig());

    // Listen for changes from settings page
    const handleRequiredFieldsChange = (event: CustomEvent) => {
      setRequiredFields(event.detail);
    };
    window.addEventListener('requiredFieldsChanged', handleRequiredFieldsChange as EventListener);
    return () => window.removeEventListener('requiredFieldsChanged', handleRequiredFieldsChange as EventListener);
  }, []);

  // Helper to check if a field is required
  const isRequired = (fieldId: string) => requiredFields[fieldId] || false;

  // Load categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategoryTree(),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: newValue }));
  };

  const handleAddTag = () => {
    if (tagInput.trim()) {
      const currentTags = formData.tags ? formData.tags.split(',').map(t => t.trim()) : [];
      if (!currentTags.includes(tagInput.trim())) {
        setFormData(prev => ({
          ...prev,
          tags: [...currentTags, tagInput.trim()].join(', '),
        }));
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = formData.tags.split(',').map(t => t.trim()).filter(t => t !== tagToRemove);
    setFormData(prev => ({ ...prev, tags: currentTags.join(', ') }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required images
    const pendingImages = (formData as any).pendingImages || [];
    const existingImages = (formData as any).images || [];
    const hasImages = pendingImages.length > 0 || existingImages.length > 0;

    if (!hasImages) {
      setImageError('É obrigatório adicionar pelo menos uma imagem ao produto');
      setActiveTab('media'); // Switch to media tab to show the error
      return;
    }

    setImageError(null);
    onSubmit(formData);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralTab formData={formData} onChange={handleChange} setFormData={setFormData} errors={errors} tagInput={tagInput} setTagInput={setTagInput} onAddTag={handleAddTag} onRemoveTag={handleRemoveTag} mode={mode} isRequired={isRequired} />;
      case 'prices':
        return <PricesTab formData={formData} onChange={handleChange} errors={errors} isRequired={isRequired} />;
      case 'inventory':
        return <InventoryTab formData={formData} onChange={handleChange} errors={errors} isRequired={isRequired} />;
      case 'shipping':
        return <ShippingTab formData={formData} onChange={handleChange} errors={errors} isRequired={isRequired} />;
      case 'seo':
        return <SeoTab formData={formData} onChange={handleChange} setFormData={setFormData} errors={errors} isRequired={isRequired} />;
      case 'media':
        return <MediaTab formData={formData} onChange={handleChange} imageError={imageError} setImageError={setImageError} />;
      case 'integrations':
        return <IntegrationsTab formData={formData} onChange={handleChange} errors={errors} />;
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tab Navigation */}
      <div className="card overflow-hidden">
        <div className="flex overflow-x-auto border-b border-dark-100 dark:border-dark-700">
          {tabs.map(tab => {
            const pendingImages = (formData as any).pendingImages || [];
            const existingImages = (formData as any).images || [];
            const hasImages = pendingImages.length > 0 || existingImages.length > 0;
            const isMediaTab = tab.id === 'media';
            const showMediaWarning = isMediaTab && !hasImages;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-dark-500 hover:text-dark-700 dark:hover:text-dark-300',
                  showMediaWarning && 'text-red-500 dark:text-red-400'
                )}
              >
                <tab.icon size={18} />
                {tab.label}
                {isMediaTab && <span className="text-red-500">*</span>}
                {showMediaWarning && (
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <button type="submit" disabled={isLoading} className="btn-primary">
          {isLoading ? 'Salvando...' : mode === 'create' ? 'Criar Produto' : 'Salvar Alterações'}
        </button>
      </div>
    </form>
  );
}

// ==================== TAB COMPONENTS ====================

function GeneralTab({ formData, onChange, setFormData, errors, tagInput, setTagInput, onAddTag, onRemoveTag, mode, isRequired }: any) {
  const tags = formData.tags ? formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [];

  // Helper to render required indicator
  const RequiredMark = ({ fieldId }: { fieldId: string }) =>
    isRequired(fieldId) ? <span className="text-red-500">*</span> : null;

  return (
    <div className="space-y-6">
      {/* Required Fields Legend */}
      <div className="text-sm text-dark-500 dark:text-dark-400 flex items-center gap-1">
        <span className="text-red-500">*</span> Campos obrigatórios
      </div>

      {/* Basic Info */}
      <div>
        <h3 className="text-sm font-semibold text-dark-700 dark:text-dark-300 mb-4 flex items-center gap-2">
          <Info size={16} />
          Informações Básicas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="label">SKU <RequiredMark fieldId="sku" /></label>
            <input
              type="text"
              name="sku"
              value={formData.sku}
              onChange={onChange}
              disabled={mode === 'edit'}
              className={cn('input', errors.sku && 'border-red-500')}
              placeholder="PROD-001"
            />
            {errors.sku && <p className="text-xs text-red-500 mt-1">{errors.sku}</p>}
          </div>
          <div>
            <label className="label">Tipo</label>
            <select name="type" value={formData.type} onChange={onChange} className="input">
              {productTypes.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Condição</label>
            <select name="productCondition" value={formData.productCondition} onChange={onChange} className="input">
              {productConditions.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <label className="label">Nome <RequiredMark fieldId="name" /></label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={onChange}
              className={cn('input', errors.name && 'border-red-500')}
              placeholder="Nome do produto"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <label className="label">Descrição Curta <RequiredMark fieldId="shortDescription" /></label>
            <textarea
              name="shortDescription"
              value={formData.shortDescription}
              onChange={onChange}
              rows={2}
              className="input"
              placeholder="Breve descrição do produto"
            />
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <label className="label">Descrição Completa <RequiredMark fieldId="description" /></label>

            {/* AI Description Generator */}
            <AIDescriptionGenerator
              productName={formData.name}
              brand={formData.brand}
              productSpecs={[
                formData.material && `Material: ${formData.material}`,
                formData.color && `Cor: ${formData.color}`,
                formData.size && `Tamanho: ${formData.size}`,
              ].filter(Boolean).join(', ')}
              onGenerated={(description) => {
                onChange({
                  target: { name: 'description', value: description }
                } as any);
              }}
              className="mb-3"
            />

            <textarea
              name="description"
              value={formData.description}
              onChange={onChange}
              rows={6}
              className="input"
              placeholder="Descrição detalhada do produto (ou use a IA acima)"
            />
          </div>
        </div>
      </div>

      {/* Brand & Manufacturer */}
      <div>
        <h3 className="text-sm font-semibold text-dark-700 dark:text-dark-300 mb-4 flex items-center gap-2">
          <Tag size={16} />
          Marca e Fabricante
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Marca / Vendor <RequiredMark fieldId="brand" /></label>
            <input
              type="text"
              name="brand"
              value={formData.brand}
              onChange={onChange}
              className="input"
              placeholder="Ex: Apple, Samsung"
            />
          </div>
          <div>
            <label className="label">Fabricante <RequiredMark fieldId="manufacturer" /></label>
            <input
              type="text"
              name="manufacturer"
              value={formData.manufacturer}
              onChange={onChange}
              className="input"
              placeholder="Nome do fabricante"
            />
          </div>
          <div>
            <label className="label">Tipo de Produto <RequiredMark fieldId="productType" /></label>
            <input
              type="text"
              name="productType"
              value={formData.productType}
              onChange={onChange}
              className="input"
              placeholder="Ex: Clothing, Electronics"
            />
          </div>
        </div>
      </div>

      {/* Tags */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-dark-700 dark:text-dark-300">Tags</h3>
          <TagSuggester
            productName={formData.name}
            description={formData.description}
            currentTags={formData.tags}
            onApply={(tags) => setFormData((prev: any) => ({ ...prev, tags }))}
          />
        </div>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), onAddTag())}
            className="input flex-1"
            placeholder="Adicionar tag..."
          />
          <button type="button" onClick={onAddTag} className="btn-secondary">
            <Plus size={18} />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag: string) => (
            <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full text-sm">
              {tag}
              <button type="button" onClick={() => onRemoveTag(tag)} className="hover:text-primary-900">
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Identifiers */}
      <div>
        <h3 className="text-sm font-semibold text-dark-700 dark:text-dark-300 mb-4 flex items-center gap-2">
          <Globe size={16} />
          Identificadores Globais
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="label">GTIN (EAN/UPC) <RequiredMark fieldId="gtin" /></label>
            <input
              type="text"
              name="gtin"
              value={formData.gtin}
              onChange={onChange}
              className="input"
              placeholder="1234567890123"
              maxLength={14}
            />
            <p className="text-xs text-dark-500 mt-1">EAN-13, UPC-A, ISBN</p>
          </div>
          <div>
            <label className="label">MPN <RequiredMark fieldId="mpn" /></label>
            <input
              type="text"
              name="mpn"
              value={formData.mpn}
              onChange={onChange}
              className="input"
              placeholder="Código do fabricante"
            />
          </div>
          <div>
            <label className="label">Código de Barras <RequiredMark fieldId="barcode" /></label>
            <input
              type="text"
              name="barcode"
              value={formData.barcode}
              onChange={onChange}
              className="input"
              placeholder="Código de barras"
            />
          </div>
          <div>
            <label className="label">NCM - Nomenclatura Comum do Mercosul</label>
            <div className="flex gap-2">
              <input
                type="text"
                name="ncm"
                value={formData.ncm}
                onChange={onChange}
                className="input flex-1"
                placeholder="Exemplo: 1001.10.10"
                maxLength={10}
              />
              <NCMSuggester
                productName={formData.name}
                gtin={formData.gtin}
                currentValue={formData.ncm}
                onSelect={(ncm) => {
                  onChange({
                    target: { name: 'ncm', value: ncm }
                  } as any);
                }}
              />
            </div>
            <p className="text-xs text-dark-500 mt-1">Necessário para emissão de Nota Fiscal</p>
          </div>

          {/* SPED Item Type */}
          <div className="md:col-span-2">
            <SpedItemTypeSelector
              value={formData.spedItemType as SpedItemType | null}
              onChange={(type) => {
                onChange({
                  target: { name: 'spedItemType', value: type || '' }
                } as any);
              }}
              productType={formData.type as ProductType}
              showDescription={true}
            />
          </div>
        </div>
      </div>

      {/* Attributes */}
      <div>
        <h3 className="text-sm font-semibold text-dark-700 dark:text-dark-300 mb-4">Atributos do Produto</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="label">Cor <RequiredMark fieldId="color" /></label>
            <input type="text" name="color" value={formData.color} onChange={onChange} className="input" placeholder="Ex: Azul" />
          </div>
          <div>
            <label className="label">Tamanho <RequiredMark fieldId="size" /></label>
            <input type="text" name="size" value={formData.size} onChange={onChange} className="input" placeholder="Ex: M, 42" />
          </div>
          <div>
            <label className="label">Material <RequiredMark fieldId="material" /></label>
            <input type="text" name="material" value={formData.material} onChange={onChange} className="input" placeholder="Ex: Algodão" />
          </div>
          <div>
            <label className="label">Padrão</label>
            <input type="text" name="pattern" value={formData.pattern} onChange={onChange} className="input" placeholder="Ex: Listrado" />
          </div>
          <div>
            <label className="label">Gênero <RequiredMark fieldId="gender" /></label>
            <select name="gender" value={formData.gender} onChange={onChange} className="input">
              {genders.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Faixa Etária</label>
            <select name="ageGroup" value={formData.ageGroup} onChange={onChange} className="input">
              {ageGroups.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Sistema de Tamanho</label>
            <input type="text" name="sizeSystem" value={formData.sizeSystem} onChange={onChange} className="input" placeholder="Ex: BR, US, EU" />
          </div>
          <div>
            <label className="label">Tipo de Tamanho</label>
            <input type="text" name="sizeType" value={formData.sizeType} onChange={onChange} className="input" placeholder="Ex: regular, plus" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PricesTab({ formData, onChange, errors, isRequired }: any) {
  const price = parseFloat(formData.price) || 0;
  const costPrice = parseFloat(formData.costPrice) || 0;
  const margin = price > 0 && costPrice > 0 ? ((price - costPrice) / price * 100).toFixed(1) : '0';
  const markup = costPrice > 0 ? ((price - costPrice) / costPrice * 100).toFixed(1) : '0';

  const RequiredMark = ({ fieldId }: { fieldId: string }) =>
    isRequired(fieldId) ? <span className="text-red-500">*</span> : null;

  return (
    <div className="space-y-6">
      {/* Main Prices */}
      <div>
        <h3 className="text-sm font-semibold text-dark-700 dark:text-dark-300 mb-4 flex items-center gap-2">
          <DollarSign size={16} />
          Preços Principais
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="label">Preço de Venda (R$) <RequiredMark fieldId="price" /></label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={onChange}
              step="0.01"
              min="0"
              className={cn('input', errors.price && 'border-red-500')}
              placeholder="0,00"
            />
          </div>
          <div>
            <label className="label">Preço de Custo (R$) <RequiredMark fieldId="costPrice" /></label>
            <input
              type="number"
              name="costPrice"
              value={formData.costPrice}
              onChange={onChange}
              step="0.01"
              min="0"
              className="input"
              placeholder="0,00"
            />
          </div>
          <div>
            <label className="label">Preço Comparativo (R$) <RequiredMark fieldId="compareAtPrice" /></label>
            <input
              type="number"
              name="compareAtPrice"
              value={formData.compareAtPrice}
              onChange={onChange}
              step="0.01"
              min="0"
              className="input"
              placeholder="Preço original (para desconto)"
            />
            <p className="text-xs text-dark-500 mt-1">Shopify: compare_at_price</p>
          </div>
          <div>
            <label className="label">Margem / Markup</label>
            <div className="flex gap-2">
              <div className="flex-1 p-2 bg-dark-100 dark:bg-dark-800 rounded-lg text-center">
                <p className="text-xs text-dark-500">Margem</p>
                <p className="font-semibold text-green-600">{margin}%</p>
              </div>
              <div className="flex-1 p-2 bg-dark-100 dark:bg-dark-800 rounded-lg text-center">
                <p className="text-xs text-dark-500">Markup</p>
                <p className="font-semibold text-blue-600">{markup}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tax Settings */}
      <div>
        <h3 className="text-sm font-semibold text-dark-700 dark:text-dark-300 mb-4">Impostos</h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="taxable"
            checked={formData.taxable}
            onChange={onChange}
            className="rounded border-dark-300"
          />
          <span className="text-sm">Produto sujeito a impostos</span>
        </label>
      </div>

      {/* Sale Settings */}
      <div>
        <h3 className="text-sm font-semibold text-dark-700 dark:text-dark-300 mb-4">Promoção</h3>
        <div className="space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="isOnSale"
              checked={formData.isOnSale}
              onChange={onChange}
              className="rounded border-dark-300"
            />
            <span className="text-sm">Produto em promoção</span>
          </label>
          {formData.isOnSale && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
              <div>
                <label className="label">Início da Promoção</label>
                <input
                  type="datetime-local"
                  name="saleStartDate"
                  value={formData.saleStartDate}
                  onChange={onChange}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Fim da Promoção</label>
                <input
                  type="datetime-local"
                  name="saleEndDate"
                  value={formData.saleEndDate}
                  onChange={onChange}
                  className="input"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Flags */}
      <div>
        <h3 className="text-sm font-semibold text-dark-700 dark:text-dark-300 mb-4">Destaques</h3>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="isFeatured"
              checked={formData.isFeatured}
              onChange={onChange}
              className="rounded border-dark-300"
            />
            <span className="text-sm">Produto em Destaque</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="isNew"
              checked={formData.isNew}
              onChange={onChange}
              className="rounded border-dark-300"
            />
            <span className="text-sm">Novidade</span>
          </label>
        </div>
      </div>
    </div>
  );
}

function InventoryTab({ formData, onChange, errors, isRequired }: any) {
  const RequiredMark = ({ fieldId }: { fieldId: string }) =>
    isRequired(fieldId) ? <span className="text-red-500">*</span> : null;

  return (
    <div className="space-y-6">
      {/* Stock */}
      <div>
        <h3 className="text-sm font-semibold text-dark-700 dark:text-dark-300 mb-4 flex items-center gap-2">
          <Warehouse size={16} />
          Controle de Estoque
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="label">Quantidade em Estoque <RequiredMark fieldId="stockQuantity" /></label>
            <input
              type="number"
              name="stockQuantity"
              value={formData.stockQuantity}
              onChange={onChange}
              min="0"
              className="input"
            />
          </div>
          <div>
            <label className="label">Política de Estoque</label>
            <select name="inventoryPolicy" value={formData.inventoryPolicy} onChange={onChange} className="input">
              {inventoryPolicies.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Gerenciamento</label>
            <input
              type="text"
              name="inventoryManagement"
              value={formData.inventoryManagement}
              onChange={onChange}
              className="input"
              placeholder="Ex: shopify, null"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="isInStock"
              checked={formData.isInStock}
              onChange={onChange}
              className="rounded border-dark-300"
            />
            <span className="text-sm">Em estoque</span>
          </label>
        </div>
      </div>

      {/* Order Quantities */}
      <div>
        <h3 className="text-sm font-semibold text-dark-700 dark:text-dark-300 mb-4">Quantidades de Pedido</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Quantidade Mínima</label>
            <input
              type="number"
              name="minOrderQty"
              value={formData.minOrderQty}
              onChange={onChange}
              min="1"
              className="input"
            />
          </div>
          <div>
            <label className="label">Quantidade Máxima</label>
            <input
              type="number"
              name="maxOrderQty"
              value={formData.maxOrderQty}
              onChange={onChange}
              min="1"
              className="input"
              placeholder="Sem limite"
            />
          </div>
          <div>
            <label className="label">Incremento</label>
            <input
              type="number"
              name="orderQtyStep"
              value={formData.orderQtyStep}
              onChange={onChange}
              min="1"
              className="input"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ShippingTab({ formData, onChange, errors, isRequired }: any) {
  const RequiredMark = ({ fieldId }: { fieldId: string }) =>
    isRequired(fieldId) ? <span className="text-red-500">*</span> : null;

  return (
    <div className="space-y-6">
      {/* Weight */}
      <div>
        <h3 className="text-sm font-semibold text-dark-700 dark:text-dark-300 mb-4 flex items-center gap-2">
          <Truck size={16} />
          Peso e Dimensões
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="label">Peso <RequiredMark fieldId="weight" /></label>
            <input
              type="number"
              name="weight"
              value={formData.weight}
              onChange={onChange}
              step="0.001"
              min="0"
              className="input"
              placeholder="0,000"
            />
          </div>
          <div>
            <label className="label">Unidade de Peso</label>
            <select name="weightUnit" value={formData.weightUnit} onChange={onChange} className="input">
              {weightUnits.map(u => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Dimensions */}
      <div>
        <h3 className="text-sm font-semibold text-dark-700 dark:text-dark-300 mb-4">Dimensões</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="label">Comprimento <RequiredMark fieldId="length" /></label>
            <input
              type="number"
              name="length"
              value={formData.length}
              onChange={onChange}
              step="0.01"
              min="0"
              className="input"
            />
          </div>
          <div>
            <label className="label">Largura <RequiredMark fieldId="width" /></label>
            <input
              type="number"
              name="width"
              value={formData.width}
              onChange={onChange}
              step="0.01"
              min="0"
              className="input"
            />
          </div>
          <div>
            <label className="label">Altura <RequiredMark fieldId="height" /></label>
            <input
              type="number"
              name="height"
              value={formData.height}
              onChange={onChange}
              step="0.01"
              min="0"
              className="input"
            />
          </div>
          <div>
            <label className="label">Unidade</label>
            <select name="dimensionUnit" value={formData.dimensionUnit} onChange={onChange} className="input">
              {dimensionUnits.map(u => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Shipping Settings */}
      <div>
        <h3 className="text-sm font-semibold text-dark-700 dark:text-dark-300 mb-4">Configurações de Envio</h3>
        <div className="space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="requiresShipping"
              checked={formData.requiresShipping}
              onChange={onChange}
              className="rounded border-dark-300"
            />
            <span className="text-sm">Requer envio físico</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Serviço de Fulfillment</label>
              <input
                type="text"
                name="fulfillmentService"
                value={formData.fulfillmentService}
                onChange={onChange}
                className="input"
                placeholder="manual"
              />
            </div>
            <div>
              <label className="label">País de Origem</label>
              <input
                type="text"
                name="countryOfOrigin"
                value={formData.countryOfOrigin}
                onChange={onChange}
                className="input"
                placeholder="BR"
                maxLength={2}
              />
            </div>
            <div>
              <label className="label">Código HS (Alfândega)</label>
              <input
                type="text"
                name="hsCode"
                value={formData.hsCode}
                onChange={onChange}
                className="input"
                placeholder="Ex: 6109.10"
                maxLength={10}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Warranty */}
      <div>
        <h3 className="text-sm font-semibold text-dark-700 dark:text-dark-300 mb-4">Garantia</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Garantia</label>
            <input
              type="text"
              name="warranty"
              value={formData.warranty}
              onChange={onChange}
              className="input"
              placeholder="Ex: 12 meses de garantia do fabricante"
            />
          </div>
          <div>
            <label className="label">Tipo de Garantia</label>
            <input
              type="text"
              name="warrantyType"
              value={formData.warrantyType}
              onChange={onChange}
              className="input"
              placeholder="Ex: Fabricante, Vendedor"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SeoTab({ formData, onChange, setFormData, errors, isRequired }: any) {
  const titleLength = formData.metaTitle?.length || 0;
  const descriptionLength = formData.metaDescription?.length || 0;

  const RequiredMark = ({ fieldId }: { fieldId: string }) =>
    isRequired(fieldId) ? <span className="text-red-500">*</span> : null;

  const handleApplySeo = (seo: { metaTitle: string; metaDescription: string; metaKeywords: string; urlKey: string }) => {
    setFormData((prev: any) => ({
      ...prev,
      ...seo,
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-dark-700 dark:text-dark-300 flex items-center gap-2">
            <Search size={16} />
            Otimização para Mecanismos de Busca
          </h3>
          <SEOOptimizer
            productName={formData.name}
            description={formData.description}
            brand={formData.brand}
            currentSeo={{
              metaTitle: formData.metaTitle,
              metaDescription: formData.metaDescription,
              metaKeywords: formData.metaKeywords,
              urlKey: formData.urlKey,
            }}
            onApply={handleApplySeo}
          />
        </div>
        <div className="space-y-4">
          <div>
            <label className="label">URL Amigável (Slug) <RequiredMark fieldId="urlKey" /></label>
            <input
              type="text"
              name="urlKey"
              value={formData.urlKey}
              onChange={onChange}
              className="input"
              placeholder="meu-produto"
            />
            <p className="text-xs text-dark-500 mt-1">
              Aparece na URL: /produtos/<span className="text-primary-600">{formData.urlKey || 'meu-produto'}</span>
            </p>
          </div>
          <div>
            <div className="flex justify-between">
              <label className="label">Meta Título <RequiredMark fieldId="metaTitle" /></label>
              <span className={cn('text-xs', titleLength > 60 ? 'text-red-500' : 'text-dark-500')}>
                {titleLength}/60
              </span>
            </div>
            <input
              type="text"
              name="metaTitle"
              value={formData.metaTitle}
              onChange={onChange}
              className="input"
              placeholder="Título para SEO"
            />
          </div>
          <div>
            <div className="flex justify-between">
              <label className="label">Meta Descrição <RequiredMark fieldId="metaDescription" /></label>
              <span className={cn('text-xs', descriptionLength > 160 ? 'text-red-500' : 'text-dark-500')}>
                {descriptionLength}/160
              </span>
            </div>
            <textarea
              name="metaDescription"
              value={formData.metaDescription}
              onChange={onChange}
              rows={3}
              className="input"
              placeholder="Descrição para SEO"
            />
          </div>
          <div>
            <label className="label">Palavras-chave <RequiredMark fieldId="metaKeywords" /></label>
            <input
              type="text"
              name="metaKeywords"
              value={formData.metaKeywords}
              onChange={onChange}
              className="input"
              placeholder="palavra1, palavra2, palavra3"
            />
          </div>
        </div>
      </div>

      {/* Google Shopping Category */}
      <div>
        <h3 className="text-sm font-semibold text-dark-700 dark:text-dark-300 mb-4 flex items-center gap-2">
          <Globe size={16} />
          Google Shopping
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Categoria Google</label>
            <input
              type="text"
              name="googleCategory"
              value={formData.googleCategory}
              onChange={onChange}
              className="input"
              placeholder="Apparel & Accessories > Clothing"
            />
          </div>
          <div>
            <label className="label">ID da Categoria</label>
            <input
              type="text"
              name="googleCategoryId"
              value={formData.googleCategoryId}
              onChange={onChange}
              className="input"
              placeholder="Ex: 1604"
            />
          </div>
        </div>
      </div>

      {/* SEO Preview */}
      <div>
        <h3 className="text-sm font-semibold text-dark-700 dark:text-dark-300 mb-4">Preview do Google</h3>
        <div className="p-4 bg-white dark:bg-dark-900 rounded-lg border border-dark-200 dark:border-dark-700">
          <p className="text-[#1a0dab] text-lg hover:underline cursor-pointer">
            {formData.metaTitle || formData.name || 'Título do Produto'}
          </p>
          <p className="text-[#006621] text-sm">
            www.seusite.com.br/produtos/{formData.urlKey || 'produto'}
          </p>
          <p className="text-[#545454] text-sm mt-1">
            {formData.metaDescription || formData.shortDescription || 'Descrição do produto aparecerá aqui...'}
          </p>
        </div>
      </div>
    </div>
  );
}

interface PendingImage {
  id: string;
  file?: File;
  blob?: Blob;
  fileName: string;
  originalUrl?: string;
  previewUrl: string;
  isMain: boolean;
}

function MediaTab({ formData, onChange, imageError, setImageError }: any) {
  const [pendingImages, setPendingImages] = useState<PendingImage[]>(formData.pendingImages || []);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [dragActive, setDragActive] = useState(false);

  // Clear error when images are added
  useEffect(() => {
    if (pendingImages.length > 0 && imageError) {
      setImageError(null);
    }
  }, [pendingImages.length, imageError, setImageError]);

  // Sync pendingImages to formData
  useEffect(() => {
    onChange({ target: { name: 'pendingImages', value: pendingImages } });
  }, [pendingImages]);

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages: PendingImage[] = Array.from(files).map((file, index) => ({
      id: generateId(),
      file,
      fileName: file.name,
      previewUrl: URL.createObjectURL(file),
      isMain: pendingImages.length === 0 && index === 0,
    }));

    setPendingImages(prev => [...prev, ...newImages]);
    e.target.value = ''; // Reset input
  }, [pendingImages.length]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    const newImages: PendingImage[] = imageFiles.map((file, index) => ({
      id: generateId(),
      file,
      fileName: file.name,
      previewUrl: URL.createObjectURL(file),
      isMain: pendingImages.length === 0 && index === 0,
    }));

    setPendingImages(prev => [...prev, ...newImages]);
  }, [pendingImages.length]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleUrlImagesReady = useCallback((images: { blob: Blob; fileName: string; originalUrl: string }[]) => {
    const newImages: PendingImage[] = images.map((img, index) => ({
      id: generateId(),
      blob: img.blob,
      fileName: img.fileName,
      originalUrl: img.originalUrl,
      previewUrl: URL.createObjectURL(img.blob),
      isMain: pendingImages.length === 0 && index === 0,
    }));

    setPendingImages(prev => {
      // Avoid duplicates by originalUrl
      const existingUrls = new Set(prev.filter(p => p.originalUrl).map(p => p.originalUrl));
      const uniqueNew = newImages.filter(n => !existingUrls.has(n.originalUrl));
      return [...prev, ...uniqueNew];
    });
  }, [pendingImages.length]);

  const removeImage = useCallback((id: string) => {
    setPendingImages(prev => {
      const filtered = prev.filter(img => img.id !== id);
      // If we removed the main image, set the first one as main
      if (filtered.length > 0 && !filtered.some(img => img.isMain)) {
        filtered[0].isMain = true;
      }
      return filtered;
    });
  }, []);

  const setMainImage = useCallback((id: string) => {
    setPendingImages(prev => prev.map(img => ({
      ...img,
      isMain: img.id === id,
    })));
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Required Field Notice */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-red-500">*</span>
        <span className="text-dark-500 dark:text-dark-400">Campo obrigatório - É necessário adicionar pelo menos uma imagem</span>
      </div>

      {/* Error Alert */}
      {imageError && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">{imageError}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-dark-200 dark:border-dark-700">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'upload'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-dark-500 hover:text-dark-700 dark:text-dark-400'
          )}
        >
          <Upload className="w-4 h-4 inline-block mr-2" />
          Upload de Arquivos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('url')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'url'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-dark-500 hover:text-dark-700 dark:text-dark-400'
          )}
        >
          <ExternalLink className="w-4 h-4 inline-block mr-2" />
          Importar por URL
        </button>
      </div>

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div
          className={cn(
            'text-center py-12 border-2 border-dashed rounded-lg transition-colors',
            dragActive
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-dark-200 dark:border-dark-700'
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <Upload className="w-12 h-12 text-dark-400 mx-auto mb-4" />
          <p className="text-dark-600 dark:text-dark-400 mb-2">
            Arraste imagens aqui ou clique para fazer upload
          </p>
          <label className="btn-secondary cursor-pointer">
            Selecionar Arquivos
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          <p className="text-xs text-dark-500 mt-2">
            Formatos aceitos: JPG, PNG, WebP, GIF • Máximo 10MB por arquivo
          </p>
        </div>
      )}

      {/* URL Tab */}
      {activeTab === 'url' && (
        <ImageUrlUploader
          onImagesReady={handleUrlImagesReady}
          maxImages={20}
        />
      )}

      {/* Pending Images List */}
      {pendingImages.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-dark-700 dark:text-dark-300">
              Imagens para upload ({pendingImages.length})
            </h4>
            <p className="text-xs text-dark-500">
              As imagens serão enviadas ao salvar o produto
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {pendingImages.map((image) => (
              <div
                key={image.id}
                className={cn(
                  'relative group rounded-lg overflow-hidden border-2 transition-colors',
                  image.isMain
                    ? 'border-primary-500 ring-2 ring-primary-200 dark:ring-primary-800'
                    : 'border-dark-200 dark:border-dark-700 hover:border-primary-300'
                )}
              >
                <div className="aspect-square bg-dark-100 dark:bg-dark-800">
                  <img
                    src={image.previewUrl}
                    alt={image.fileName}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Main badge */}
                {image.isMain && (
                  <div className="absolute top-2 left-2 px-2 py-1 bg-primary-500 text-white text-xs font-medium rounded">
                    Principal
                  </div>
                )}

                {/* URL badge */}
                {image.originalUrl && (
                  <div className="absolute top-2 right-2 p-1 bg-dark-800/80 rounded">
                    <ExternalLink className="w-3 h-3 text-white" />
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-dark-900/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {!image.isMain && (
                    <button
                      type="button"
                      onClick={() => setMainImage(image.id)}
                      className="p-2 bg-white rounded-full text-dark-700 hover:text-primary-500"
                      title="Definir como principal"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(image.id)}
                    className="p-2 bg-white rounded-full text-red-500 hover:text-red-600"
                    title="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* File name */}
                <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-dark-900/80">
                  <p className="text-xs text-white truncate">{image.fileName}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <p className="font-medium">Dicas para imagens de produtos</p>
          <ul className="mt-1 list-disc list-inside text-blue-600 dark:text-blue-400">
            <li>Use imagens de alta qualidade (mínimo 800x800 pixels)</li>
            <li>Fundo branco ou neutro é recomendado</li>
            <li>A imagem principal aparecerá nas listagens</li>
            <li>Você pode reordenar as imagens após salvar o produto</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function IntegrationsTab({ formData, onChange, errors }: any) {
  const [activeIntegration, setActiveIntegration] = useState('shopify');

  const integrations = [
    { id: 'shopify', label: 'Shopify', icon: ShoppingBag, color: '#96BF48' },
    { id: 'mercadolivre', label: 'Mercado Livre', icon: Tag, color: '#FFE600' },
    { id: 'amazon', label: 'Amazon', icon: Package, color: '#FF9900' },
    { id: 'woocommerce', label: 'WooCommerce', icon: Globe, color: '#96588A' },
  ];

  return (
    <div className="space-y-6">
      {/* Integration Tabs */}
      <div className="flex flex-wrap gap-2">
        {integrations.map(integration => (
          <button
            key={integration.id}
            type="button"
            onClick={() => setActiveIntegration(integration.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeIntegration === integration.id
                ? 'bg-dark-900 text-white dark:bg-white dark:text-dark-900'
                : 'bg-dark-100 dark:bg-dark-800 hover:bg-dark-200 dark:hover:bg-dark-700'
            )}
          >
            <integration.icon size={18} style={{ color: activeIntegration === integration.id ? undefined : integration.color }} />
            {integration.label}
          </button>
        ))}
      </div>

      {/* Shopify */}
      {activeIntegration === 'shopify' && (
        <div className="space-y-4 p-4 bg-dark-50 dark:bg-dark-800/50 rounded-lg">
          <h4 className="font-semibold text-dark-900 dark:text-white flex items-center gap-2">
            <ShoppingBag size={20} style={{ color: '#96BF48' }} />
            Configurações Shopify
          </h4>
          <p className="text-sm text-dark-500">
            Os campos de Shopify já estão preenchidos automaticamente a partir dos dados gerais do produto.
            Configure conexões de loja em Configurações → Shopify.
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-white dark:bg-dark-900 rounded">
              <p className="text-dark-500">Título</p>
              <p className="font-medium">{formData.name || '-'}</p>
            </div>
            <div className="p-3 bg-white dark:bg-dark-900 rounded">
              <p className="text-dark-500">Vendor</p>
              <p className="font-medium">{formData.brand || formData.vendor || '-'}</p>
            </div>
            <div className="p-3 bg-white dark:bg-dark-900 rounded">
              <p className="text-dark-500">Tipo</p>
              <p className="font-medium">{formData.productType || '-'}</p>
            </div>
            <div className="p-3 bg-white dark:bg-dark-900 rounded">
              <p className="text-dark-500">Tags</p>
              <p className="font-medium">{formData.tags || '-'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Mercado Livre */}
      {activeIntegration === 'mercadolivre' && (
        <div className="space-y-4 p-4 bg-dark-50 dark:bg-dark-800/50 rounded-lg">
          <h4 className="font-semibold text-dark-900 dark:text-white flex items-center gap-2">
            <Tag size={20} style={{ color: '#FFE600' }} />
            Configurações Mercado Livre
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo de Anúncio</label>
              <select name="mlListingType" value={formData.mlListingType} onChange={onChange} className="input">
                {mlListingTypes.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">ID da Categoria ML</label>
              <input
                type="text"
                name="mlCategoryId"
                value={formData.mlCategoryId}
                onChange={onChange}
                className="input"
                placeholder="Ex: MLB1430"
              />
            </div>
            <div>
              <label className="label">Modo de Envio</label>
              <input
                type="text"
                name="mlShippingMode"
                value={formData.mlShippingMode}
                onChange={onChange}
                className="input"
                placeholder="me1, me2, custom"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="mlFreeShipping"
                  checked={formData.mlFreeShipping}
                  onChange={onChange}
                  className="rounded border-dark-300"
                />
                <span className="text-sm">Frete Grátis</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Amazon */}
      {activeIntegration === 'amazon' && (
        <div className="space-y-4 p-4 bg-dark-50 dark:bg-dark-800/50 rounded-lg">
          <h4 className="font-semibold text-dark-900 dark:text-white flex items-center gap-2">
            <Package size={20} style={{ color: '#FF9900' }} />
            Configurações Amazon
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">ASIN</label>
              <input
                type="text"
                name="asin"
                value={formData.asin}
                onChange={onChange}
                className="input"
                placeholder="B08N5WRWNW"
                maxLength={10}
              />
            </div>
            <div>
              <label className="label">Canal de Fulfillment</label>
              <select name="amazonFulfillmentChannel" value={formData.amazonFulfillmentChannel} onChange={onChange} className="input">
                {amazonFulfillmentChannels.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Tipo de Produto Amazon</label>
              <input
                type="text"
                name="amazonProductType"
                value={formData.amazonProductType}
                onChange={onChange}
                className="input"
                placeholder="SHIRT"
              />
            </div>
            <div>
              <label className="label">Browse Node ID</label>
              <input
                type="text"
                name="amazonBrowseNodeId"
                value={formData.amazonBrowseNodeId}
                onChange={onChange}
                className="input"
                placeholder="Ex: 7141123011"
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Bullet Points (um por linha)</label>
              <textarea
                name="amazonBulletPoints"
                value={formData.amazonBulletPoints}
                onChange={onChange}
                rows={5}
                className="input"
                placeholder="• Característica 1&#10;• Característica 2&#10;• Característica 3"
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Search Terms (Backend Keywords)</label>
              <textarea
                name="amazonSearchTerms"
                value={formData.amazonSearchTerms}
                onChange={onChange}
                rows={2}
                className="input"
                placeholder="palavras chave separadas por espaço"
              />
              <p className="text-xs text-dark-500 mt-1">Máximo de 250 bytes. Não repita palavras do título.</p>
            </div>
          </div>
        </div>
      )}

      {/* WooCommerce */}
      {activeIntegration === 'woocommerce' && (
        <div className="space-y-4 p-4 bg-dark-50 dark:bg-dark-800/50 rounded-lg">
          <h4 className="font-semibold text-dark-900 dark:text-white flex items-center gap-2">
            <Globe size={20} style={{ color: '#96588A' }} />
            Configurações WooCommerce
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">URL Externa (Afiliados)</label>
              <input
                type="url"
                name="externalUrl"
                value={formData.externalUrl}
                onChange={onChange}
                className="input"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="label">Texto do Botão</label>
              <input
                type="text"
                name="buttonText"
                value={formData.buttonText}
                onChange={onChange}
                className="input"
                placeholder="Comprar Agora"
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Nota de Compra</label>
              <textarea
                name="purchaseNote"
                value={formData.purchaseNote}
                onChange={onChange}
                rows={2}
                className="input"
                placeholder="Nota exibida após a compra"
              />
            </div>
            <div>
              <label className="label">Limite de Downloads</label>
              <input
                type="number"
                name="downloadLimit"
                value={formData.downloadLimit}
                onChange={onChange}
                className="input"
                placeholder="-1 = ilimitado"
              />
            </div>
            <div>
              <label className="label">Expiração (dias)</label>
              <input
                type="number"
                name="downloadExpiry"
                value={formData.downloadExpiry}
                onChange={onChange}
                className="input"
                placeholder="-1 = nunca"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
