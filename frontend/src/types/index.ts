// User types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  locale: string;
  timezone: string;
  avatar: string | null;
  roles: string[];
  permissions: string[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// Product types
export type ProductStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED';
export type ProductType = 'SIMPLE' | 'CONFIGURABLE' | 'VIRTUAL' | 'BUNDLE' | 'GROUPED';

export interface Product {
  id: string;
  sku: string;
  name: string;
  price: number | null;
  status: ProductStatus;
  type: ProductType;
  completenessScore: number;
  stockQuantity: number;
  isInStock: boolean;
  categoryCount: number;
  mediaCount: number;
  mainImageUrl?: string | null;
  brand?: string | null;
  categories?: CategorySummary[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductDetail extends Product {
  description: string | null;
  shortDescription: string | null;
  costPrice: number | null;
  brand: string | null;
  manufacturer: string | null;
  weight: number;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  urlKey: string | null;
  categories: CategorySummary[];
  media: MediaSummary[];
}

export interface ProductStatistics {
  total: number;
  draft: number;
  pendingReview: number;
  approved: number;
  published: number;
  archived: number;
}

// Category types
export interface Category {
  id: string;
  code: string;
  name: string;
  level: number;
  position: number;
  isActive: boolean;
  parentId: string | null;
  childCount: number;
}

export interface CategoryDetail extends Category {
  description: string | null;
  path: string;
  urlKey: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  image: string | null;
  children: Category[];
}

export interface CategorySummary {
  id: string;
  code: string;
  name: string;
}

export interface CategoryTreeNode {
  id: string;
  code: string;
  name: string;
  level: number;
  position: number;
  isActive: boolean;
  children: CategoryTreeNode[];
  productCount?: number;
}

// Attribute types
export type AttributeType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'RICHTEXT'
  | 'NUMBER'
  | 'DECIMAL'
  | 'PRICE'
  | 'BOOLEAN'
  | 'SELECT'
  | 'MULTISELECT'
  | 'DATE'
  | 'DATETIME'
  | 'IMAGE'
  | 'FILE'
  | 'JSON';

export interface Attribute {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: AttributeType;
  groupId: string | null;
  isRequired: boolean;
  isUnique: boolean;
  isFilterable: boolean;
  isSearchable: boolean;
  isLocalizable: boolean;
  isScopable: boolean;
  useInGrid: boolean;
  position: number;
}

export interface AttributeGroup {
  id: string;
  code: string;
  name: string;
  description: string | null;
  position: number;
}

// Media types
export type MediaType = 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO';

export interface MediaSummary {
  id: string;
  fileName: string;
  url: string | null;
  isMain: boolean;
}

export interface Media {
  id: string;
  productId: string;
  type: MediaType;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string | null;
  alt: string | null;
  title: string | null;
  position: number;
  isMain: boolean;
  locale: string | null;
}

// API types
export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface ApiError {
  message: string;
  status: number;
  error: string;
  errorCode: string;
  timestamp?: string;
  details?: Record<string, string | null>;
  traceId?: string;
  // Legacy field for backward compatibility
  errors?: Record<string, string[]>;
}

// Error codes from backend
export type ErrorCode =
  | 'RESOURCE_NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'INVALID_REQUEST'
  | 'ACCESS_DENIED'
  | 'AUTHENTICATION_FAILED'
  | 'INTERNAL_ERROR'
  | 'FILE_TOO_LARGE'
  // Domain-specific errors
  | 'PRODUCT_NOT_FOUND'
  | 'CATEGORY_NOT_FOUND'
  | 'ATTRIBUTE_NOT_FOUND'
  | 'SKU_ALREADY_EXISTS'
  | 'CODE_ALREADY_EXISTS'
  | 'INVALID_CREDENTIALS'
  | 'TOKEN_EXPIRED'
  | 'ACCOUNT_DISABLED'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'PASSWORD_MISMATCH'
  | 'IMPORT_FAILED'
  | 'EXPORT_FAILED'
  | string;

// ==================== PRODUCT TYPES (BUNDLE, GROUPED) ====================

// Bundle Component
export interface BundleComponent {
  id: string;
  componentId: string;
  componentSku: string;
  componentName: string;
  quantity: number;
  position: number;
  specialPrice: number | null;
  componentPrice: number | null;
  componentStock: number;
}

// Grouped Product Item
export interface GroupedProductItem {
  id: string;
  childId: string;
  childSku: string;
  childName: string;
  defaultQuantity: number;
  minQuantity: number;
  maxQuantity: number | null;
  position: number;
  childPrice: number | null;
  childStock: number;
}

// Product Type Info
export interface ProductTypeInfo {
  productId: string;
  productSku: string;
  productName: string;
  type: ProductType;
  canConvertTo: ProductType[];
  bundleComponents: BundleComponent[] | null;
  groupedItems: GroupedProductItem[] | null;
  variantsCount: number | null;
}

// Stock Validation
export interface StockValidationResult {
  isValid: boolean;
  message: string | null;
  availableQuantity: number | null;
  requestedQuantity: number | null;
}

// Stock Decrement
export interface DecrementedProduct {
  productId: string;
  sku: string;
  previousStock: number;
  newStock: number;
  decrementedAmount: number;
}

export interface StockDecrementResult {
  success: boolean;
  message: string | null;
  decrementedProducts: DecrementedProduct[];
}

// Product Type Labels
export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  SIMPLE: 'Simples',
  CONFIGURABLE: 'Configurável',
  VIRTUAL: 'Virtual',
  BUNDLE: 'Bundle',
  GROUPED: 'Agrupado',
};

export const PRODUCT_TYPE_DESCRIPTIONS: Record<ProductType, string> = {
  SIMPLE: 'Produto individual com SKU único',
  CONFIGURABLE: 'Produto pai com variantes baseadas em atributos',
  VIRTUAL: 'Produto não-físico como serviços ou downloads',
  BUNDLE: 'Conjunto fixo de produtos vendidos como unidade única',
  GROUPED: 'Produtos relacionados apresentados juntos',
};

// ==================== SPED FISCAL TYPES ====================

/**
 * Tipo do Item SPED para classificação fiscal
 * Conforme Tabela 4.3.1 do Guia Prático EFD ICMS/IPI
 */
export type SpedItemType =
  | 'MERCADORIA_REVENDA'
  | 'MATERIA_PRIMA'
  | 'EMBALAGEM'
  | 'PRODUTO_EM_PROCESSO'
  | 'PRODUTO_ACABADO'
  | 'SUBPRODUTO'
  | 'PRODUTO_INTERMEDIARIO'
  | 'MATERIAL_USO_CONSUMO'
  | 'ATIVO_IMOBILIZADO'
  | 'SERVICOS'
  | 'OUTROS_INSUMOS'
  | 'OUTRAS';

/**
 * Resposta da API para tipos de item SPED
 */
export interface SpedItemTypeResponse {
  /** Identificador do enum (ex: MERCADORIA_REVENDA) */
  value: SpedItemType;
  /** Código SPED oficial (ex: "00") */
  code: string;
  /** Descrição em português (ex: "Mercadoria para Revenda") */
  description: string;
}

/**
 * Labels para exibição dos tipos SPED
 */
export const SPED_ITEM_TYPE_LABELS: Record<SpedItemType, string> = {
  MERCADORIA_REVENDA: '00 - Mercadoria para Revenda',
  MATERIA_PRIMA: '01 - Matéria-Prima',
  EMBALAGEM: '02 - Embalagem',
  PRODUTO_EM_PROCESSO: '03 - Produto em Processo',
  PRODUTO_ACABADO: '04 - Produto Acabado',
  SUBPRODUTO: '05 - Subproduto',
  PRODUTO_INTERMEDIARIO: '06 - Produto Intermediário',
  MATERIAL_USO_CONSUMO: '07 - Material de Uso e Consumo',
  ATIVO_IMOBILIZADO: '08 - Ativo Imobilizado',
  SERVICOS: '09 - Serviços',
  OUTROS_INSUMOS: '10 - Outros Insumos',
  OUTRAS: '99 - Outras',
};

/**
 * Descrições detalhadas dos tipos SPED
 */
export const SPED_ITEM_TYPE_DESCRIPTIONS: Record<SpedItemType, string> = {
  MERCADORIA_REVENDA: 'Produtos adquiridos para comercialização direta',
  MATERIA_PRIMA: 'Insumos utilizados na fabricação de produtos',
  EMBALAGEM: 'Materiais de embalagem dos produtos',
  PRODUTO_EM_PROCESSO: 'Produtos em fase de fabricação',
  PRODUTO_ACABADO: 'Produtos finalizados prontos para venda',
  SUBPRODUTO: 'Produtos secundários resultantes do processo produtivo',
  PRODUTO_INTERMEDIARIO: 'Produtos consumidos no processo de industrialização',
  MATERIAL_USO_CONSUMO: 'Materiais de escritório, limpeza, etc.',
  ATIVO_IMOBILIZADO: 'Bens do ativo permanente',
  SERVICOS: 'Prestação de serviços',
  OUTROS_INSUMOS: 'Outros materiais não classificados',
  OUTRAS: 'Demais situações não previstas',
};

/**
 * Códigos SPED correspondentes a cada tipo
 */
export const SPED_ITEM_TYPE_CODES: Record<SpedItemType, string> = {
  MERCADORIA_REVENDA: '00',
  MATERIA_PRIMA: '01',
  EMBALAGEM: '02',
  PRODUTO_EM_PROCESSO: '03',
  PRODUTO_ACABADO: '04',
  SUBPRODUTO: '05',
  PRODUTO_INTERMEDIARIO: '06',
  MATERIAL_USO_CONSUMO: '07',
  ATIVO_IMOBILIZADO: '08',
  SERVICOS: '09',
  OUTROS_INSUMOS: '10',
  OUTRAS: '99',
};
