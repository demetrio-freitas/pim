package com.pim.infrastructure.web

import com.pim.application.ProductService
import com.pim.application.ProductStatistics
import com.pim.domain.product.Product
import com.pim.domain.product.ProductStatus
import com.pim.domain.product.ProductType
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
import org.springframework.data.web.PageableDefault
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*
import java.math.BigDecimal
import java.util.*

@RestController
@RequestMapping("/api/products")
@Tag(name = "Products", description = "Product management endpoints")
class ProductController(
    private val productService: ProductService
) {

    @GetMapping
    @Operation(summary = "List all products")
    @PreAuthorize("hasAuthority('products.view')")
    fun list(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @RequestParam(required = false) status: ProductStatus?,
        @RequestParam(required = false) categoryId: UUID?,
        @RequestParam(required = false) search: String?,
        @RequestParam(required = false) type: ProductType?,
        @RequestParam(defaultValue = "name") sortBy: String,
        @RequestParam(defaultValue = "asc") sortDirection: String
    ): ResponseEntity<Page<ProductResponse>> {
        // Map frontend field names to entity field names
        val sortField = when (sortBy) {
            "name" -> "name"
            "sku" -> "sku"
            "price" -> "price"
            "createdAt" -> "createdAt"
            "stockQuantity" -> "stockQuantity"
            "completenessScore" -> "completenessScore"
            else -> "name"
        }

        val direction = if (sortDirection.equals("desc", ignoreCase = true)) {
            Sort.Direction.DESC
        } else {
            Sort.Direction.ASC
        }

        val pageable = PageRequest.of(page, size, Sort.by(direction, sortField))

        val products = when {
            search != null -> productService.search(search, pageable)
            categoryId != null -> productService.findByCategory(categoryId, pageable)
            status != null && type != null -> productService.findByStatusAndType(status, type, pageable)
            status != null -> productService.findByStatus(status, pageable)
            type != null -> productService.findByType(type, pageable)
            else -> productService.findAll(pageable)
        }

        return ResponseEntity.ok(products.map { it.toResponse() })
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get product by ID")
    @PreAuthorize("hasAuthority('products.view')")
    fun getById(@PathVariable id: UUID): ResponseEntity<ProductDetailResponse> {
        val product = productService.findById(id)
            ?: return ResponseEntity.notFound().build()

        return ResponseEntity.ok(product.toDetailResponse())
    }

    @GetMapping("/sku/{sku}")
    @Operation(summary = "Get product by SKU")
    @PreAuthorize("hasAuthority('products.view')")
    fun getBySku(@PathVariable sku: String): ResponseEntity<ProductDetailResponse> {
        val product = productService.findBySku(sku)
            ?: return ResponseEntity.notFound().build()

        return ResponseEntity.ok(product.toDetailResponse())
    }

    @PostMapping
    @Operation(summary = "Create a new product")
    @PreAuthorize("hasAuthority('products.create')")
    fun create(@Valid @RequestBody request: CreateProductRequest): ResponseEntity<ProductResponse> {
        val product = Product(
            sku = request.sku,
            name = request.name,
            description = request.description,
            shortDescription = request.shortDescription,
            price = request.price,
            costPrice = request.costPrice,
            type = request.type,
            brand = request.brand,
            manufacturer = request.manufacturer,
            weight = request.weight ?: BigDecimal.ZERO,
            metaTitle = request.metaTitle,
            metaDescription = request.metaDescription,
            metaKeywords = request.metaKeywords,
            urlKey = request.urlKey,
            stockQuantity = request.stockQuantity,
            isInStock = request.isInStock,
            ncm = request.ncm,
            hsCode = request.hsCode,
            gtin = request.gtin,
            mpn = request.mpn,
            barcode = request.barcode
        )

        val created = productService.create(product)
        return ResponseEntity.status(HttpStatus.CREATED).body(created.toResponse())
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a product")
    @PreAuthorize("hasAuthority('products.edit')")
    fun update(
        @PathVariable id: UUID,
        @Valid @RequestBody request: UpdateProductRequest
    ): ResponseEntity<ProductResponse> {
        val updated = productService.update(id) { product ->
            request.name?.let { product.name = it }
            request.description?.let { product.description = it }
            request.shortDescription?.let { product.shortDescription = it }
            request.price?.let { product.price = it }
            request.costPrice?.let { product.costPrice = it }
            request.brand?.let { product.brand = it }
            request.manufacturer?.let { product.manufacturer = it }
            request.weight?.let { product.weight = it }
            request.metaTitle?.let { product.metaTitle = it }
            request.metaDescription?.let { product.metaDescription = it }
            request.metaKeywords?.let { product.metaKeywords = it }
            request.urlKey?.let { product.urlKey = it }
            request.stockQuantity?.let { product.stockQuantity = it }
            request.isInStock?.let { product.isInStock = it }
        }

        return ResponseEntity.ok(updated.toResponse())
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update product status")
    @PreAuthorize("hasAuthority('products.edit')")
    fun updateStatus(
        @PathVariable id: UUID,
        @RequestBody request: UpdateStatusRequest
    ): ResponseEntity<ProductResponse> {
        val updated = productService.updateStatus(id, request.status)
        return ResponseEntity.ok(updated.toResponse())
    }

    @PostMapping("/{id}/categories/{categoryId}")
    @Operation(summary = "Add product to category")
    @PreAuthorize("hasAuthority('products.edit')")
    fun addToCategory(
        @PathVariable id: UUID,
        @PathVariable categoryId: UUID
    ): ResponseEntity<ProductResponse> {
        val updated = productService.addToCategory(id, categoryId)
        return ResponseEntity.ok(updated.toResponse())
    }

    @DeleteMapping("/{id}/categories/{categoryId}")
    @Operation(summary = "Remove product from category")
    @PreAuthorize("hasAuthority('products.edit')")
    fun removeFromCategory(
        @PathVariable id: UUID,
        @PathVariable categoryId: UUID
    ): ResponseEntity<ProductResponse> {
        val updated = productService.removeFromCategory(id, categoryId)
        return ResponseEntity.ok(updated.toResponse())
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a product")
    @PreAuthorize("hasAuthority('products.delete')")
    fun delete(@PathVariable id: UUID): ResponseEntity<Void> {
        productService.delete(id)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/bulk/status")
    @Operation(summary = "Bulk update product status")
    @PreAuthorize("hasAuthority('products.edit')")
    fun bulkUpdateStatus(@RequestBody request: BulkStatusRequest): ResponseEntity<BulkOperationResult> {
        val updated = productService.bulkUpdateStatus(request.ids, request.status)
        return ResponseEntity.ok(BulkOperationResult(updated, request.ids.size - updated))
    }

    @GetMapping("/statistics")
    @Operation(summary = "Get product statistics")
    @PreAuthorize("hasAuthority('products.view')")
    fun getStatistics(): ResponseEntity<ProductStatistics> {
        return ResponseEntity.ok(productService.getStatistics())
    }

    @GetMapping("/incomplete")
    @Operation(summary = "Get incomplete products")
    @PreAuthorize("hasAuthority('products.view')")
    fun getIncomplete(
        @RequestParam(defaultValue = "80") threshold: Int,
        @PageableDefault(size = 20) pageable: Pageable
    ): ResponseEntity<Page<ProductResponse>> {
        val products = productService.findIncomplete(threshold, pageable)
        return ResponseEntity.ok(products.map { it.toResponse() })
    }

    @GetMapping("/recent")
    @Operation(summary = "Get recently created products")
    @PreAuthorize("hasAuthority('products.view')")
    fun getRecent(@RequestParam(defaultValue = "5") limit: Int): ResponseEntity<List<ProductResponse>> {
        val products = productService.findRecent(limit)
        return ResponseEntity.ok(products.map { it.toResponse() })
    }

    @GetMapping("/low-stock")
    @Operation(summary = "Get products with low stock")
    @PreAuthorize("hasAuthority('products.view')")
    fun getLowStock(
        @RequestParam(defaultValue = "10") threshold: Int,
        @PageableDefault(size = 20) pageable: Pageable
    ): ResponseEntity<Page<ProductResponse>> {
        val products = productService.findLowStock(threshold, pageable)
        return ResponseEntity.ok(products.map { it.toResponse() })
    }

    @GetMapping("/no-images")
    @Operation(summary = "Get products without images")
    @PreAuthorize("hasAuthority('products.view')")
    fun getNoImages(@PageableDefault(size = 20) pageable: Pageable): ResponseEntity<Page<ProductResponse>> {
        val products = productService.findWithoutImages(pageable)
        return ResponseEntity.ok(products.map { it.toResponse() })
    }

    @GetMapping("/search/advanced")
    @Operation(summary = "Advanced product search with multiple filters")
    @PreAuthorize("hasAuthority('products.view')")
    fun advancedSearch(
        @RequestParam(required = false) query: String?,
        @RequestParam(required = false) categoryId: UUID?,
        @RequestParam(required = false) brand: String?,
        @RequestParam(required = false) minPrice: BigDecimal?,
        @RequestParam(required = false) maxPrice: BigDecimal?,
        @RequestParam(required = false) status: ProductStatus?,
        @RequestParam(required = false) type: ProductType?,
        @RequestParam(required = false) hasImages: Boolean?,
        @RequestParam(required = false) minStock: Int?,
        @RequestParam(required = false) maxStock: Int?,
        @RequestParam(required = false) minCompleteness: Int?,
        @RequestParam(required = false) maxCompleteness: Int?,
        @RequestParam(required = false) tags: String?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @RequestParam(defaultValue = "name") sortBy: String,
        @RequestParam(defaultValue = "asc") sortDirection: String
    ): ResponseEntity<AdvancedSearchResponse> {
        val sortField = when (sortBy) {
            "name" -> "name"
            "sku" -> "sku"
            "price" -> "price"
            "createdAt" -> "createdAt"
            "stockQuantity" -> "stockQuantity"
            "completenessScore" -> "completenessScore"
            else -> "name"
        }

        val direction = if (sortDirection.equals("desc", ignoreCase = true)) {
            Sort.Direction.DESC
        } else {
            Sort.Direction.ASC
        }

        val pageable = PageRequest.of(page, size, Sort.by(direction, sortField))

        val products = productService.advancedSearch(
            query = query,
            categoryId = categoryId,
            brand = brand,
            minPrice = minPrice,
            maxPrice = maxPrice,
            status = status,
            type = type,
            hasImages = hasImages,
            minStock = minStock,
            maxStock = maxStock,
            minCompleteness = minCompleteness,
            maxCompleteness = maxCompleteness,
            tags = tags?.split(",")?.map { it.trim() },
            pageable = pageable
        )

        val appliedFilters = mutableMapOf<String, Any?>()
        query?.let { appliedFilters["query"] = it }
        categoryId?.let { appliedFilters["categoryId"] = it }
        brand?.let { appliedFilters["brand"] = it }
        if (minPrice != null || maxPrice != null) {
            appliedFilters["priceRange"] = mapOf("min" to minPrice, "max" to maxPrice)
        }
        status?.let { appliedFilters["status"] = it }
        type?.let { appliedFilters["type"] = it }
        hasImages?.let { appliedFilters["hasImages"] = it }
        if (minStock != null || maxStock != null) {
            appliedFilters["stockRange"] = mapOf("min" to minStock, "max" to maxStock)
        }
        if (minCompleteness != null || maxCompleteness != null) {
            appliedFilters["completenessRange"] = mapOf("min" to minCompleteness, "max" to maxCompleteness)
        }
        tags?.let { appliedFilters["tags"] = it.split(",").map { t -> t.trim() } }

        return ResponseEntity.ok(
            AdvancedSearchResponse(
                content = products.content.map { it.toResponse() },
                totalElements = products.totalElements,
                totalPages = products.totalPages,
                number = products.number,
                size = products.size,
                appliedFilters = appliedFilters,
                sortBy = sortBy,
                sortDirection = sortDirection
            )
        )
    }

    @GetMapping("/search/suggestions")
    @Operation(summary = "Get search suggestions for autocomplete")
    @PreAuthorize("hasAuthority('products.view')")
    fun getSearchSuggestions(
        @RequestParam query: String,
        @RequestParam(defaultValue = "8") limit: Int
    ): ResponseEntity<List<SearchSuggestion>> {
        if (query.length < 2) {
            return ResponseEntity.ok(emptyList())
        }

        val suggestions = productService.getSearchSuggestions(query, limit)
        return ResponseEntity.ok(suggestions)
    }

    @GetMapping("/search/recent")
    @Operation(summary = "Get recent searches for the current user")
    @PreAuthorize("hasAuthority('products.view')")
    fun getRecentSearches(): ResponseEntity<List<String>> {
        // This would typically be stored per user in the database
        // For now, we return an empty list as this is handled client-side
        return ResponseEntity.ok(emptyList())
    }
}

// Request/Response DTOs
data class CreateProductRequest(
    @field:NotBlank val sku: String,
    @field:NotBlank val name: String,
    val description: String? = null,
    val shortDescription: String? = null,
    val price: BigDecimal? = null,
    val costPrice: BigDecimal? = null,
    val type: ProductType = ProductType.SIMPLE,
    val brand: String? = null,
    val manufacturer: String? = null,
    val weight: BigDecimal? = null,
    val metaTitle: String? = null,
    val metaDescription: String? = null,
    val metaKeywords: String? = null,
    val urlKey: String? = null,
    val stockQuantity: Int = 0,
    val isInStock: Boolean = true,
    val ncm: String? = null,
    val hsCode: String? = null,
    val gtin: String? = null,
    val mpn: String? = null,
    val barcode: String? = null
)

data class UpdateProductRequest(
    val name: String? = null,
    val description: String? = null,
    val shortDescription: String? = null,
    val price: BigDecimal? = null,
    val costPrice: BigDecimal? = null,
    val brand: String? = null,
    val manufacturer: String? = null,
    val weight: BigDecimal? = null,
    val metaTitle: String? = null,
    val metaDescription: String? = null,
    val metaKeywords: String? = null,
    val urlKey: String? = null,
    val stockQuantity: Int? = null,
    val isInStock: Boolean? = null
)

data class UpdateStatusRequest(val status: ProductStatus)

data class BulkStatusRequest(val ids: List<UUID>, val status: ProductStatus)

data class BulkOperationResult(val success: Int, val failed: Int)

data class ProductResponse(
    val id: UUID,
    val sku: String,
    val name: String,
    val price: BigDecimal?,
    val status: ProductStatus,
    val type: ProductType,
    val completenessScore: Int,
    val stockQuantity: Int,
    val isInStock: Boolean,
    val categoryCount: Int,
    val mediaCount: Int,
    val mainImageUrl: String?
)

data class ProductDetailResponse(
    val id: UUID,
    val sku: String,
    val name: String,
    val description: String?,
    val shortDescription: String?,
    val price: BigDecimal?,
    val costPrice: BigDecimal?,
    val compareAtPrice: BigDecimal?,
    val status: ProductStatus,
    val type: ProductType,
    val brand: String?,
    val vendor: String?,
    val manufacturer: String?,
    val productType: String?,
    val tags: String?,
    val barcode: String?,
    val weight: BigDecimal,
    val weightUnit: String,
    val requiresShipping: Boolean,
    val taxable: Boolean,
    val fulfillmentService: String?,
    val inventoryPolicy: String,
    val inventoryManagement: String?,
    val publishedAt: java.time.Instant?,
    val publishedScope: String?,
    val templateSuffix: String?,
    // Shopify sync
    val shopifyProductId: String?,
    val shopifyVariantId: String?,
    val shopifyInventoryItemId: String?,
    val shopifySyncedAt: java.time.Instant?,
    // Google Shopping
    val gtin: String?,
    val mpn: String?,
    val googleCategory: String?,
    val googleCategoryId: String?,
    val productCondition: String,
    val ageGroup: String?,
    val gender: String?,
    val color: String?,
    val size: String?,
    val sizeType: String?,
    val sizeSystem: String?,
    val material: String?,
    val pattern: String?,
    // Mercado Livre
    val mlItemId: String?,
    val mlListingType: String?,
    val warranty: String?,
    val warrantyType: String?,
    val mlShippingMode: String?,
    val mlFreeShipping: Boolean,
    val mlCategoryId: String?,
    val mlSyncedAt: java.time.Instant?,
    // Amazon
    val asin: String?,
    val amazonBulletPoints: String?,
    val amazonSearchTerms: String?,
    val amazonFulfillmentChannel: String?,
    val amazonProductType: String?,
    val amazonBrowseNodeId: String?,
    val amazonSyncedAt: java.time.Instant?,
    // VTEX
    val vtexProductId: String?,
    val vtexSkuId: String?,
    val vtexTradePolicies: String?,
    val vtexSyncedAt: java.time.Instant?,
    // WooCommerce
    val wooProductId: String?,
    val externalUrl: String?,
    val buttonText: String?,
    val purchaseNote: String?,
    val downloadFiles: String?,
    val downloadLimit: Int?,
    val downloadExpiry: Int?,
    val wooSyncedAt: java.time.Instant?,
    // Dimensions
    val length: BigDecimal?,
    val width: BigDecimal?,
    val height: BigDecimal?,
    val dimensionUnit: String,
    // Additional
    val countryOfOrigin: String?,
    val hsCode: String?,
    val ncm: String?,
    val minOrderQty: Int,
    val maxOrderQty: Int?,
    val orderQtyStep: Int,
    val isFeatured: Boolean,
    val isNew: Boolean,
    val isOnSale: Boolean,
    val saleStartDate: java.time.Instant?,
    val saleEndDate: java.time.Instant?,
    val relatedProductIds: String?,
    val crossSellProductIds: String?,
    val upSellProductIds: String?,
    // SEO
    val metaTitle: String?,
    val metaDescription: String?,
    val metaKeywords: String?,
    val urlKey: String?,
    // Stock & completeness
    val completenessScore: Int,
    val stockQuantity: Int,
    val isInStock: Boolean,
    // Timestamps
    val createdAt: java.time.Instant,
    val updatedAt: java.time.Instant,
    // Relations
    val categories: List<CategorySummary>,
    val media: List<MediaSummary>,
    val attributes: List<AttributeSummary>
)

data class CategorySummary(val id: UUID, val code: String, val name: String)
data class MediaSummary(val id: UUID, val fileName: String, val url: String?, val isMain: Boolean)
data class AttributeSummary(val id: UUID, val code: String, val value: String?, val locale: String?)

// Advanced Search DTOs
data class AdvancedSearchResponse(
    val content: List<ProductResponse>,
    val totalElements: Long,
    val totalPages: Int,
    val number: Int,
    val size: Int,
    val appliedFilters: Map<String, Any?>,
    val sortBy: String,
    val sortDirection: String
)

data class SearchSuggestion(
    val type: String, // "product", "category", "brand"
    val text: String,
    val subtext: String?,
    val id: String,
    val imageUrl: String? = null
)

fun Product.toResponse() = ProductResponse(
    id = id,
    sku = sku,
    name = name,
    price = price,
    status = status,
    type = type,
    completenessScore = completenessScore,
    stockQuantity = stockQuantity,
    isInStock = isInStock,
    categoryCount = categories.size,
    mediaCount = media.size,
    mainImageUrl = media.find { it.isMain }?.url ?: media.firstOrNull()?.url
)

fun Product.toDetailResponse() = ProductDetailResponse(
    id = id,
    sku = sku,
    name = name,
    description = description,
    shortDescription = shortDescription,
    price = price,
    costPrice = costPrice,
    compareAtPrice = compareAtPrice,
    status = status,
    type = type,
    brand = brand,
    vendor = vendor,
    manufacturer = manufacturer,
    productType = productType,
    tags = tags,
    barcode = barcode,
    weight = weight,
    weightUnit = weightUnit.name,
    requiresShipping = requiresShipping,
    taxable = taxable,
    fulfillmentService = fulfillmentService,
    inventoryPolicy = inventoryPolicy.name,
    inventoryManagement = inventoryManagement,
    publishedAt = publishedAt,
    publishedScope = publishedScope,
    templateSuffix = templateSuffix,
    // Shopify sync
    shopifyProductId = shopifyProductId,
    shopifyVariantId = shopifyVariantId,
    shopifyInventoryItemId = shopifyInventoryItemId,
    shopifySyncedAt = shopifySyncedAt,
    // Google Shopping
    gtin = gtin,
    mpn = mpn,
    googleCategory = googleCategory,
    googleCategoryId = googleCategoryId,
    productCondition = productCondition.name,
    ageGroup = ageGroup?.name,
    gender = gender?.name,
    color = color,
    size = size,
    sizeType = sizeType,
    sizeSystem = sizeSystem,
    material = material,
    pattern = pattern,
    // Mercado Livre
    mlItemId = mlItemId,
    mlListingType = mlListingType?.name,
    warranty = warranty,
    warrantyType = warrantyType,
    mlShippingMode = mlShippingMode,
    mlFreeShipping = mlFreeShipping,
    mlCategoryId = mlCategoryId,
    mlSyncedAt = mlSyncedAt,
    // Amazon
    asin = asin,
    amazonBulletPoints = amazonBulletPoints,
    amazonSearchTerms = amazonSearchTerms,
    amazonFulfillmentChannel = amazonFulfillmentChannel?.name,
    amazonProductType = amazonProductType,
    amazonBrowseNodeId = amazonBrowseNodeId,
    amazonSyncedAt = amazonSyncedAt,
    // VTEX
    vtexProductId = vtexProductId,
    vtexSkuId = vtexSkuId,
    vtexTradePolicies = vtexTradePolicies,
    vtexSyncedAt = vtexSyncedAt,
    // WooCommerce
    wooProductId = wooProductId,
    externalUrl = externalUrl,
    buttonText = buttonText,
    purchaseNote = purchaseNote,
    downloadFiles = downloadFiles,
    downloadLimit = downloadLimit,
    downloadExpiry = downloadExpiry,
    wooSyncedAt = wooSyncedAt,
    // Dimensions
    length = length,
    width = width,
    height = height,
    dimensionUnit = dimensionUnit.name,
    // Additional
    countryOfOrigin = countryOfOrigin,
    hsCode = hsCode,
    ncm = ncm,
    minOrderQty = minOrderQty,
    maxOrderQty = maxOrderQty,
    orderQtyStep = orderQtyStep,
    isFeatured = isFeatured,
    isNew = isNew,
    isOnSale = isOnSale,
    saleStartDate = saleStartDate,
    saleEndDate = saleEndDate,
    relatedProductIds = relatedProductIds,
    crossSellProductIds = crossSellProductIds,
    upSellProductIds = upSellProductIds,
    // SEO
    metaTitle = metaTitle,
    metaDescription = metaDescription,
    metaKeywords = metaKeywords,
    urlKey = urlKey,
    // Stock & completeness
    completenessScore = completenessScore,
    stockQuantity = stockQuantity,
    isInStock = isInStock,
    // Timestamps
    createdAt = createdAt,
    updatedAt = updatedAt,
    // Relations
    categories = categories.map { CategorySummary(it.id, it.code, it.name) },
    media = media.map { MediaSummary(it.id, it.fileName, it.url, it.isMain) },
    attributes = attributes.map { AttributeSummary(it.id, it.attribute.code, it.getValue()?.toString(), it.locale) }
)
