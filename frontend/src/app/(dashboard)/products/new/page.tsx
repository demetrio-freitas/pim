'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ProductForm, ProductFormData } from '@/components/ProductForm';
import { showSuccess, showError, showInfo } from '@/lib/toast';
import { ArrowLeft } from 'lucide-react';

interface PendingImage {
  id: string;
  file?: File;
  blob?: Blob;
  fileName: string;
  originalUrl?: string;
  previewUrl: string;
  isMain: boolean;
}

export default function NewProductPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      // Transform form data to API format
      const apiData = {
        sku: data.sku,
        name: data.name,
        description: data.description || null,
        shortDescription: data.shortDescription || null,
        type: data.type,
        brand: data.brand || null,
        vendor: data.vendor || data.brand || null,
        manufacturer: data.manufacturer || null,
        productType: data.productType || null,
        tags: data.tags || null,
        productCondition: data.productCondition,

        // Identifiers
        gtin: data.gtin || null,
        mpn: data.mpn || null,
        barcode: data.barcode || null,
        googleCategory: data.googleCategory || null,
        googleCategoryId: data.googleCategoryId || null,

        // Attributes
        ageGroup: data.ageGroup || null,
        gender: data.gender || null,
        color: data.color || null,
        size: data.size || null,
        sizeType: data.sizeType || null,
        sizeSystem: data.sizeSystem || null,
        material: data.material || null,
        pattern: data.pattern || null,

        // Prices
        price: data.price ? parseFloat(data.price) : null,
        costPrice: data.costPrice ? parseFloat(data.costPrice) : null,
        compareAtPrice: data.compareAtPrice ? parseFloat(data.compareAtPrice) : null,
        taxable: data.taxable,

        // Inventory
        stockQuantity: parseInt(data.stockQuantity) || 0,
        isInStock: data.isInStock,
        inventoryPolicy: data.inventoryPolicy,
        inventoryManagement: data.inventoryManagement || null,
        minOrderQty: parseInt(data.minOrderQty) || 1,
        maxOrderQty: data.maxOrderQty ? parseInt(data.maxOrderQty) : null,
        orderQtyStep: parseInt(data.orderQtyStep) || 1,

        // Shipping
        weight: data.weight ? parseFloat(data.weight) : 0,
        weightUnit: data.weightUnit,
        length: data.length ? parseFloat(data.length) : null,
        width: data.width ? parseFloat(data.width) : null,
        height: data.height ? parseFloat(data.height) : null,
        dimensionUnit: data.dimensionUnit,
        requiresShipping: data.requiresShipping,
        fulfillmentService: data.fulfillmentService || 'manual',
        countryOfOrigin: data.countryOfOrigin || null,
        hsCode: data.hsCode || null,
        ncm: data.ncm || null,

        // SEO
        urlKey: data.urlKey || null,
        metaTitle: data.metaTitle || null,
        metaDescription: data.metaDescription || null,
        metaKeywords: data.metaKeywords || null,

        // Flags
        isFeatured: data.isFeatured,
        isNew: data.isNew,
        isOnSale: data.isOnSale,
        saleStartDate: data.saleStartDate || null,
        saleEndDate: data.saleEndDate || null,

        // Warranty
        warranty: data.warranty || null,
        warrantyType: data.warrantyType || null,

        // Mercado Livre
        mlListingType: data.mlListingType || null,
        mlShippingMode: data.mlShippingMode || null,
        mlFreeShipping: data.mlFreeShipping,
        mlCategoryId: data.mlCategoryId || null,

        // Amazon
        asin: data.asin || null,
        amazonBulletPoints: data.amazonBulletPoints || null,
        amazonSearchTerms: data.amazonSearchTerms || null,
        amazonFulfillmentChannel: data.amazonFulfillmentChannel || null,
        amazonProductType: data.amazonProductType || null,
        amazonBrowseNodeId: data.amazonBrowseNodeId || null,

        // WooCommerce
        externalUrl: data.externalUrl || null,
        buttonText: data.buttonText || null,
        purchaseNote: data.purchaseNote || null,
        downloadLimit: data.downloadLimit ? parseInt(data.downloadLimit) : null,
        downloadExpiry: data.downloadExpiry ? parseInt(data.downloadExpiry) : null,
      };

      // Create the product first
      const product = await api.createProduct(apiData);

      // Upload pending images if any
      const pendingImages: PendingImage[] = (data as any).pendingImages || [];
      if (pendingImages.length > 0) {
        setUploadProgress(`Enviando imagens (0/${pendingImages.length})...`);

        let mainMediaId: string | null = null;

        for (let i = 0; i < pendingImages.length; i++) {
          const image = pendingImages[i];
          setUploadProgress(`Enviando imagens (${i + 1}/${pendingImages.length})...`);

          try {
            // Create a File from blob if needed
            let fileToUpload: File;
            if (image.file) {
              fileToUpload = image.file;
            } else if (image.blob) {
              fileToUpload = new File([image.blob], image.fileName, { type: image.blob.type });
            } else {
              continue;
            }

            const media = await api.uploadProductMedia(product.id, fileToUpload);

            // Track main image
            if (image.isMain && media.id) {
              mainMediaId = media.id;
            }
          } catch (error) {
            console.error(`Failed to upload image ${image.fileName}:`, error);
          }
        }

        // Set main image if specified
        if (mainMediaId) {
          try {
            await api.setMainProductImage(product.id, mainMediaId);
          } catch (error) {
            console.error('Failed to set main image:', error);
          }
        }

        setUploadProgress(null);
      }

      return product;
    },
    onSuccess: (data) => {
      showSuccess('Produto criado com sucesso!');
      router.push(`/products/${data.id}`);
    },
    onError: (error: any) => {
      setUploadProgress(null);
      showError(error);
      if (error.errors) {
        setErrors(error.errors);
      }
    },
  });

  const handleSubmit = (data: ProductFormData) => {
    // Validate required fields
    const newErrors: Record<string, string> = {};

    if (!data.sku.trim()) {
      newErrors.sku = 'SKU é obrigatório';
    }
    if (!data.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    mutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/products"
          className="p-2 hover:bg-dark-100 dark:hover:bg-dark-800 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white">
            Novo Produto
          </h1>
          <p className="text-dark-500 dark:text-dark-400 mt-1">
            Crie um novo produto no catálogo
          </p>
        </div>
      </div>

      <ProductForm
        onSubmit={handleSubmit}
        isLoading={mutation.isPending}
        errors={errors}
        mode="create"
      />
    </div>
  );
}
