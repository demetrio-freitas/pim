// Storage key for localStorage
const STORAGE_KEY = 'pim_required_fields';

// Product fields definition
const productFields = {
  general: {
    fields: [
      { id: 'sku', alwaysRequired: true },
      { id: 'name', alwaysRequired: true },
      { id: 'description', alwaysRequired: false },
      { id: 'shortDescription', alwaysRequired: false },
      { id: 'brand', alwaysRequired: false },
      { id: 'manufacturer', alwaysRequired: false },
      { id: 'productType', alwaysRequired: false },
    ],
  },
  identifiers: {
    fields: [
      { id: 'gtin', alwaysRequired: false },
      { id: 'mpn', alwaysRequired: false },
      { id: 'barcode', alwaysRequired: false },
    ],
  },
  pricing: {
    fields: [
      { id: 'price', alwaysRequired: false },
      { id: 'costPrice', alwaysRequired: false },
      { id: 'compareAtPrice', alwaysRequired: false },
    ],
  },
  inventory: {
    fields: [
      { id: 'stockQuantity', alwaysRequired: false },
      { id: 'weight', alwaysRequired: false },
      { id: 'length', alwaysRequired: false },
      { id: 'width', alwaysRequired: false },
      { id: 'height', alwaysRequired: false },
    ],
  },
  shipping: {
    fields: [
      { id: 'countryOfOrigin', alwaysRequired: false },
      { id: 'hsCode', alwaysRequired: false },
      { id: 'ncm', alwaysRequired: false },
    ],
  },
  seo: {
    fields: [
      { id: 'metaTitle', alwaysRequired: false },
      { id: 'metaDescription', alwaysRequired: false },
      { id: 'metaKeywords', alwaysRequired: false },
      { id: 'urlKey', alwaysRequired: false },
    ],
  },
  categorization: {
    fields: [
      { id: 'categories', alwaysRequired: false },
      { id: 'tags', alwaysRequired: false },
      { id: 'googleCategory', alwaysRequired: false },
    ],
  },
  apparel: {
    fields: [
      { id: 'size', alwaysRequired: false },
      { id: 'color', alwaysRequired: false },
      { id: 'material', alwaysRequired: false },
      { id: 'pattern', alwaysRequired: false },
      { id: 'ageGroup', alwaysRequired: false },
      { id: 'gender', alwaysRequired: false },
    ],
  },
  media: {
    fields: [
      { id: 'images', alwaysRequired: false },
      { id: 'mainImage', alwaysRequired: false },
    ],
  },
};

// Get default required fields
const getDefaultRequiredFields = (): Record<string, boolean> => {
  const defaults: Record<string, boolean> = {};
  Object.values(productFields).forEach(group => {
    group.fields.forEach(field => {
      defaults[field.id] = field.alwaysRequired || false;
    });
  });
  return defaults;
};

// Get stored required fields
const getStoredRequiredFields = (): Record<string, boolean> => {
  if (typeof window === 'undefined') return getDefaultRequiredFields();
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return { ...getDefaultRequiredFields(), ...JSON.parse(stored) };
    } catch {
      return getDefaultRequiredFields();
    }
  }
  return getDefaultRequiredFields();
};

// Export helper function to get required fields (for use in ProductForm)
export const getRequiredProductFields = (): Record<string, boolean> => {
  return getStoredRequiredFields();
};
