package com.pim.domain.product

import com.pim.domain.category.Category
import jakarta.persistence.*
import org.springframework.data.annotation.CreatedDate
import org.springframework.data.annotation.LastModifiedDate
import org.springframework.data.jpa.domain.support.AuditingEntityListener
import java.math.BigDecimal
import java.time.Instant
import java.util.*

@Entity
@Table(name = "products")
@EntityListeners(AuditingEntityListener::class)
data class Product(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(nullable = false, unique = true)
    var sku: String,

    @Column(nullable = false)
    var name: String,

    @Column(columnDefinition = "TEXT")
    var description: String? = null,

    @Column(columnDefinition = "TEXT")
    var shortDescription: String? = null,

    @Column(precision = 19, scale = 4)
    var price: BigDecimal? = null,

    @Column(precision = 19, scale = 4)
    var costPrice: BigDecimal? = null,

    // Shopify-compatible: compare_at_price (original price for showing discounts)
    @Column(name = "compare_at_price", precision = 19, scale = 4)
    var compareAtPrice: BigDecimal? = null,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: ProductStatus = ProductStatus.DRAFT,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var type: ProductType = ProductType.SIMPLE,

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "product_categories",
        joinColumns = [JoinColumn(name = "product_id")],
        inverseJoinColumns = [JoinColumn(name = "category_id")]
    )
    var categories: MutableSet<Category> = mutableSetOf(),

    @OneToMany(mappedBy = "product", cascade = [CascadeType.ALL], orphanRemoval = true)
    var attributes: MutableList<ProductAttribute> = mutableListOf(),

    @OneToMany(mappedBy = "product", cascade = [CascadeType.ALL], orphanRemoval = true)
    var media: MutableList<ProductMedia> = mutableListOf(),

    @OneToMany(mappedBy = "parent", cascade = [CascadeType.ALL], orphanRemoval = true)
    var variants: MutableList<Product> = mutableListOf(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    var parent: Product? = null,

    @Column(nullable = false)
    var weight: BigDecimal = BigDecimal.ZERO,

    // Shopify-compatible: vendor
    var vendor: String? = null,

    // Legacy: brand (alias for vendor)
    var brand: String? = null,

    var manufacturer: String? = null,

    // Shopify-compatible: product_type (e.g., "Clothing", "Electronics")
    @Column(name = "product_type")
    var productType: String? = null,

    // Shopify-compatible: tags (comma-separated)
    @Column(columnDefinition = "TEXT")
    var tags: String? = null,

    // Shopify-compatible: barcode (EAN, UPC, GTIN)
    var barcode: String? = null,

    // Shopify-compatible: weight_unit (kg, g, lb, oz)
    @Column(name = "weight_unit")
    @Enumerated(EnumType.STRING)
    var weightUnit: WeightUnit = WeightUnit.KG,

    // Shopify-compatible: requires_shipping
    @Column(name = "requires_shipping")
    var requiresShipping: Boolean = true,

    // Shopify-compatible: taxable
    var taxable: Boolean = true,

    // Shopify-compatible: fulfillment_service
    @Column(name = "fulfillment_service")
    var fulfillmentService: String? = "manual",

    // Shopify-compatible: inventory_policy (deny = don't sell when out of stock, continue = allow overselling)
    @Column(name = "inventory_policy")
    @Enumerated(EnumType.STRING)
    var inventoryPolicy: InventoryPolicy = InventoryPolicy.DENY,

    // Shopify-compatible: inventory_management (null = don't track, shopify = track in Shopify)
    @Column(name = "inventory_management")
    var inventoryManagement: String? = null,

    // Shopify-compatible: published_at
    @Column(name = "published_at")
    var publishedAt: Instant? = null,

    // Shopify-compatible: published_scope (web, global)
    @Column(name = "published_scope")
    var publishedScope: String? = "global",

    // Shopify-compatible: template_suffix (for custom product templates)
    @Column(name = "template_suffix")
    var templateSuffix: String? = null,

    // Shopify sync fields
    @Column(name = "shopify_product_id")
    var shopifyProductId: String? = null,

    @Column(name = "shopify_variant_id")
    var shopifyVariantId: String? = null,

    @Column(name = "shopify_inventory_item_id")
    var shopifyInventoryItemId: String? = null,

    @Column(name = "shopify_synced_at")
    var shopifySyncedAt: Instant? = null,

    // ==================== GOOGLE SHOPPING / GLOBAL MARKETPLACE FIELDS ====================

    // GTIN (Global Trade Item Number) - EAN-13, UPC-A, ISBN, etc.
    @Column(length = 14)
    var gtin: String? = null,

    // MPN (Manufacturer Part Number)
    var mpn: String? = null,

    // Google Product Category (e.g., "Apparel & Accessories > Clothing > Shirts")
    @Column(name = "google_category", columnDefinition = "TEXT")
    var googleCategory: String? = null,

    // Google Category ID (numeric)
    @Column(name = "google_category_id")
    var googleCategoryId: String? = null,

    // Product condition: new, refurbished, used
    @Enumerated(EnumType.STRING)
    @Column(name = "product_condition")
    var productCondition: ProductCondition = ProductCondition.NEW,

    // Age group: newborn, infant, toddler, kids, adult
    @Column(name = "age_group")
    @Enumerated(EnumType.STRING)
    var ageGroup: AgeGroup? = null,

    // Gender: male, female, unisex
    @Enumerated(EnumType.STRING)
    var gender: Gender? = null,

    // Color (for variants and Google Shopping)
    var color: String? = null,

    // Size (for variants and Google Shopping)
    var size: String? = null,

    // Size type: regular, petite, plus, tall, big, maternity
    @Column(name = "size_type")
    var sizeType: String? = null,

    // Size system: US, UK, EU, BR, etc.
    @Column(name = "size_system")
    var sizeSystem: String? = null,

    // Material (e.g., "Cotton", "Polyester")
    var material: String? = null,

    // Pattern (e.g., "Solid", "Striped", "Floral")
    var pattern: String? = null,

    // ==================== MERCADO LIVRE FIELDS ====================

    // Mercado Livre item ID
    @Column(name = "ml_item_id")
    var mlItemId: String? = null,

    // Listing type: gold_special, gold_pro, gold, silver, bronze, free
    @Column(name = "ml_listing_type")
    @Enumerated(EnumType.STRING)
    var mlListingType: MLListingType? = null,

    // Warranty (e.g., "12 meses de garantia do fabricante")
    @Column(name = "warranty")
    var warranty: String? = null,

    // Warranty type
    @Column(name = "warranty_type")
    var warrantyType: String? = null,

    // Shipping mode: me1, me2, custom, not_specified
    @Column(name = "ml_shipping_mode")
    var mlShippingMode: String? = null,

    // Free shipping flag
    @Column(name = "ml_free_shipping")
    var mlFreeShipping: Boolean = false,

    // ML Category ID
    @Column(name = "ml_category_id")
    var mlCategoryId: String? = null,

    // ML synced timestamp
    @Column(name = "ml_synced_at")
    var mlSyncedAt: Instant? = null,

    // ==================== AMAZON FIELDS ====================

    // Amazon ASIN
    @Column(length = 10)
    var asin: String? = null,

    // Amazon bullet points (JSON array stored as text)
    @Column(name = "amazon_bullet_points", columnDefinition = "TEXT")
    var amazonBulletPoints: String? = null,

    // Amazon search terms (backend keywords)
    @Column(name = "amazon_search_terms", columnDefinition = "TEXT")
    var amazonSearchTerms: String? = null,

    // Fulfillment channel: FBA (Fulfilled by Amazon), FBM (Fulfilled by Merchant)
    @Column(name = "amazon_fulfillment_channel")
    @Enumerated(EnumType.STRING)
    var amazonFulfillmentChannel: AmazonFulfillmentChannel? = null,

    // Amazon product type (browse node specific)
    @Column(name = "amazon_product_type")
    var amazonProductType: String? = null,

    // Amazon browse node ID
    @Column(name = "amazon_browse_node_id")
    var amazonBrowseNodeId: String? = null,

    // Amazon synced timestamp
    @Column(name = "amazon_synced_at")
    var amazonSyncedAt: Instant? = null,

    // ==================== VTEX FIELDS ====================

    // VTEX product ID
    @Column(name = "vtex_product_id")
    var vtexProductId: String? = null,

    // VTEX SKU ID
    @Column(name = "vtex_sku_id")
    var vtexSkuId: String? = null,

    // Trade policy IDs (comma-separated)
    @Column(name = "vtex_trade_policies")
    var vtexTradePolicies: String? = null,

    // VTEX synced timestamp
    @Column(name = "vtex_synced_at")
    var vtexSyncedAt: Instant? = null,

    // ==================== WOOCOMMERCE FIELDS ====================

    // WooCommerce product ID
    @Column(name = "woo_product_id")
    var wooProductId: String? = null,

    // External product URL (for affiliate products)
    @Column(name = "external_url")
    var externalUrl: String? = null,

    // Button text for external products
    @Column(name = "button_text")
    var buttonText: String? = null,

    // Purchase note (shown after purchase)
    @Column(name = "purchase_note", columnDefinition = "TEXT")
    var purchaseNote: String? = null,

    // Downloadable files (JSON array)
    @Column(name = "download_files", columnDefinition = "TEXT")
    var downloadFiles: String? = null,

    // Download limit (-1 for unlimited)
    @Column(name = "download_limit")
    var downloadLimit: Int? = null,

    // Download expiry days (-1 for never)
    @Column(name = "download_expiry")
    var downloadExpiry: Int? = null,

    // WooCommerce synced timestamp
    @Column(name = "woo_synced_at")
    var wooSyncedAt: Instant? = null,

    // ==================== DIMENSIONS ====================

    // Length in cm
    var length: BigDecimal? = null,

    // Width in cm
    var width: BigDecimal? = null,

    // Height in cm
    var height: BigDecimal? = null,

    // Dimension unit
    @Column(name = "dimension_unit")
    @Enumerated(EnumType.STRING)
    var dimensionUnit: DimensionUnit = DimensionUnit.CM,

    // ==================== ADDITIONAL FIELDS ====================

    // Country of origin (ISO code)
    @Column(name = "country_of_origin", length = 2)
    var countryOfOrigin: String? = null,

    // HS Code (Harmonized System) for customs
    @Column(name = "hs_code", length = 10)
    var hsCode: String? = null,

    // NCM (Nomenclatura Comum do Mercosul) - Brazilian tax classification
    @Column(name = "ncm", length = 10)
    var ncm: String? = null,

    // SPED Item Type - Tipo do Item para SPED Fiscal e NF-e
    @Enumerated(EnumType.STRING)
    @Column(name = "sped_item_type")
    var spedItemType: SpedItemType? = null,

    // Minimum order quantity
    @Column(name = "min_order_qty")
    var minOrderQty: Int = 1,

    // Maximum order quantity
    @Column(name = "max_order_qty")
    var maxOrderQty: Int? = null,

    // Order quantity step
    @Column(name = "order_qty_step")
    var orderQtyStep: Int = 1,

    // Is featured product
    @Column(name = "is_featured")
    var isFeatured: Boolean = false,

    // Is new arrival
    @Column(name = "is_new")
    var isNew: Boolean = false,

    // Is on sale
    @Column(name = "is_on_sale")
    var isOnSale: Boolean = false,

    // Sale start date
    @Column(name = "sale_start_date")
    var saleStartDate: Instant? = null,

    // Sale end date
    @Column(name = "sale_end_date")
    var saleEndDate: Instant? = null,

    // Related product IDs (comma-separated UUIDs)
    @Column(name = "related_product_ids", columnDefinition = "TEXT")
    var relatedProductIds: String? = null,

    // Cross-sell product IDs (comma-separated UUIDs)
    @Column(name = "cross_sell_product_ids", columnDefinition = "TEXT")
    var crossSellProductIds: String? = null,

    // Up-sell product IDs (comma-separated UUIDs)
    @Column(name = "up_sell_product_ids", columnDefinition = "TEXT")
    var upSellProductIds: String? = null,

    @Column(name = "meta_title")
    var metaTitle: String? = null,

    @Column(name = "meta_description", columnDefinition = "TEXT")
    var metaDescription: String? = null,

    @Column(name = "meta_keywords")
    var metaKeywords: String? = null,

    @Column(name = "url_key", unique = true)
    var urlKey: String? = null,

    @Column(name = "stock_quantity")
    var stockQuantity: Int = 0,

    @Column(name = "is_in_stock")
    var isInStock: Boolean = true,

    @Column(name = "completeness_score")
    var completenessScore: Int = 0,

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant = Instant.now(),

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()
) {
    fun addAttribute(attribute: ProductAttribute) {
        attributes.add(attribute)
        attribute.product = this
    }

    fun removeAttribute(attribute: ProductAttribute) {
        attributes.remove(attribute)
        attribute.product = null
    }

    fun addMedia(mediaItem: ProductMedia) {
        media.add(mediaItem)
        mediaItem.product = this
    }

    fun removeMedia(mediaItem: ProductMedia) {
        media.remove(mediaItem)
        mediaItem.product = null
    }

    fun addVariant(variant: Product) {
        variants.add(variant)
        variant.parent = this
    }

    fun calculateCompleteness(): Int {
        var score = 0
        var total = 0

        // Required fields
        total += 5
        if (sku.isNotBlank()) score++
        if (name.isNotBlank()) score++
        if (!description.isNullOrBlank()) score++
        if (price != null && price!! > BigDecimal.ZERO) score++
        if (categories.isNotEmpty()) score++

        // Optional fields
        total += 5
        if (!shortDescription.isNullOrBlank()) score++
        if (!brand.isNullOrBlank()) score++
        if (media.isNotEmpty()) score++
        if (!metaTitle.isNullOrBlank()) score++
        if (!urlKey.isNullOrBlank()) score++

        return ((score.toDouble() / total) * 100).toInt()
    }
}

enum class ProductStatus {
    DRAFT,
    PENDING_REVIEW,
    APPROVED,
    PUBLISHED,
    ARCHIVED
}

enum class ProductType {
    SIMPLE,
    CONFIGURABLE,
    VIRTUAL,
    BUNDLE,
    GROUPED
}

// Shopify-compatible weight units
enum class WeightUnit {
    KG,  // Kilograms
    G,   // Grams
    LB,  // Pounds
    OZ   // Ounces
}

// Shopify-compatible inventory policy
enum class InventoryPolicy {
    DENY,    // Don't allow purchases when out of stock
    CONTINUE // Allow overselling
}

// Product condition (Google Shopping, Marketplaces)
enum class ProductCondition {
    NEW,
    REFURBISHED,
    USED
}

// Age group (Google Shopping)
enum class AgeGroup {
    NEWBORN,
    INFANT,
    TODDLER,
    KIDS,
    ADULT
}

// Gender (Google Shopping)
enum class Gender {
    MALE,
    FEMALE,
    UNISEX
}

// Mercado Livre listing types
enum class MLListingType {
    GOLD_SPECIAL,  // Clássico com destaque
    GOLD_PRO,      // Premium
    GOLD,          // Clássico
    SILVER,        // Grátis com exposição média
    BRONZE,        // Grátis com exposição baixa
    FREE           // Grátis
}

// Amazon fulfillment channels
enum class AmazonFulfillmentChannel {
    FBA,  // Fulfilled by Amazon
    FBM   // Fulfilled by Merchant
}

// Dimension units
enum class DimensionUnit {
    CM,   // Centimeters
    MM,   // Millimeters
    IN,   // Inches
    M     // Meters
}

/**
 * Tipo do Item para SPED Fiscal (EFD ICMS/IPI) e NF-e
 * Classificação conforme Tabela 4.3.1 do Guia Prático EFD ICMS/IPI
 *
 * Este campo é obrigatório para geração de arquivos SPED Fiscal e NF-e.
 * Cada tipo determina o tratamento tributário aplicável ao produto.
 */
enum class SpedItemType(
    val code: String,
    val description: String
) {
    /** Mercadoria para Revenda - Produtos adquiridos para comercialização */
    MERCADORIA_REVENDA("00", "Mercadoria para Revenda"),

    /** Matéria-Prima - Insumos utilizados na fabricação de produtos */
    MATERIA_PRIMA("01", "Matéria-Prima"),

    /** Embalagem - Materiais de embalagem dos produtos */
    EMBALAGEM("02", "Embalagem"),

    /** Produto em Processo - Produtos em fase de fabricação */
    PRODUTO_EM_PROCESSO("03", "Produto em Processo"),

    /** Produto Acabado - Produtos finalizados prontos para venda */
    PRODUTO_ACABADO("04", "Produto Acabado"),

    /** Subproduto - Produtos secundários resultantes do processo produtivo */
    SUBPRODUTO("05", "Subproduto"),

    /** Produto Intermediário - Produtos consumidos no processo de industrialização */
    PRODUTO_INTERMEDIARIO("06", "Produto Intermediário"),

    /** Material de Uso e Consumo - Materiais de escritório, limpeza, etc. */
    MATERIAL_USO_CONSUMO("07", "Material de Uso e Consumo"),

    /** Ativo Imobilizado - Bens do ativo permanente */
    ATIVO_IMOBILIZADO("08", "Ativo Imobilizado"),

    /** Serviços - Prestação de serviços */
    SERVICOS("09", "Serviços"),

    /** Outros Insumos - Outros materiais não classificados */
    OUTROS_INSUMOS("10", "Outros Insumos"),

    /** Outras - Demais situações não previstas */
    OUTRAS("99", "Outras");

    companion object {
        /**
         * Encontra o tipo pelo código SPED
         */
        fun fromCode(code: String): SpedItemType? {
            return entries.find { it.code == code }
        }

        /**
         * Retorna o tipo padrão para produtos físicos
         */
        fun defaultForPhysicalProduct(): SpedItemType = MERCADORIA_REVENDA

        /**
         * Retorna o tipo padrão para serviços/produtos virtuais
         */
        fun defaultForVirtualProduct(): SpedItemType = SERVICOS
    }
}
