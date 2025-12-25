package com.pim.application

import com.pim.config.CacheConfig
import com.pim.domain.product.Product
import com.pim.domain.product.ProductStatus
import com.pim.domain.product.ProductType
import com.pim.domain.shared.ProductNotFoundException
import com.pim.domain.shared.ProductAlreadyExistsException
import com.pim.domain.shared.CategoryNotFoundException
import com.pim.infrastructure.persistence.ProductRepository
import com.pim.infrastructure.persistence.CategoryRepository
import com.pim.infrastructure.web.SearchSuggestion
import jakarta.persistence.criteria.Predicate
import org.slf4j.LoggerFactory
import org.springframework.cache.annotation.CacheEvict
import org.springframework.cache.annotation.Cacheable
import org.springframework.cache.annotation.Caching
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.domain.Specification
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.util.*

@Service
@Transactional
class ProductService(
    private val productRepository: ProductRepository,
    private val categoryRepository: CategoryRepository
) {
    private val logger = LoggerFactory.getLogger(ProductService::class.java)

    @Cacheable(
        cacheNames = [CacheConfig.PRODUCT_BY_ID_CACHE],
        key = "#id",
        unless = "#result == null"
    )
    @Transactional(readOnly = true)
    fun findById(id: UUID): Product? {
        logger.debug("Fetching product by id: $id")
        // Fetch in separate queries to avoid MultipleBagFetchException
        val product = productRepository.findByIdWithCategories(id) ?: return null
        productRepository.findByIdWithAttributes(id)
        productRepository.findByIdWithMedia(id)
        return product
    }

    @Cacheable(
        cacheNames = [CacheConfig.PRODUCT_BY_SKU_CACHE],
        key = "#sku",
        unless = "#result == null"
    )
    @Transactional(readOnly = true)
    fun findBySku(sku: String): Product? {
        logger.debug("Fetching product by SKU: $sku")
        return productRepository.findBySku(sku)
    }

    @Transactional(readOnly = true)
    fun findAll(pageable: Pageable): Page<Product> {
        return productRepository.findAllRootProducts(pageable)
    }

    @Transactional(readOnly = true)
    fun findByStatus(status: ProductStatus, pageable: Pageable): Page<Product> {
        return productRepository.findByStatus(status, pageable)
    }

    @Transactional(readOnly = true)
    fun findByCategory(categoryId: UUID, pageable: Pageable): Page<Product> {
        return productRepository.findByCategoryId(categoryId, pageable)
    }

    @Transactional(readOnly = true)
    fun findByType(type: ProductType, pageable: Pageable): Page<Product> {
        return productRepository.findByType(type, pageable)
    }

    @Transactional(readOnly = true)
    fun findByStatusAndType(status: ProductStatus, type: ProductType, pageable: Pageable): Page<Product> {
        return productRepository.findByStatusAndType(status, type, pageable)
    }

    @Transactional(readOnly = true)
    fun search(query: String, pageable: Pageable): Page<Product> {
        return productRepository.search(query, pageable)
    }

    @Transactional(readOnly = true)
    fun findIncomplete(threshold: Int = 80, pageable: Pageable): Page<Product> {
        return productRepository.findIncompleteProducts(threshold, pageable)
    }

    @Caching(evict = [
        CacheEvict(cacheNames = [CacheConfig.DASHBOARD_STATS_CACHE], allEntries = true)
    ])
    fun create(product: Product): Product {
        // Validate price is not negative
        product.price?.let { price ->
            if (price < BigDecimal.ZERO) {
                throw IllegalArgumentException("Product price cannot be negative: $price")
            }
        }
        product.costPrice?.let { costPrice ->
            if (costPrice < BigDecimal.ZERO) {
                throw IllegalArgumentException("Product cost price cannot be negative: $costPrice")
            }
        }

        product.completenessScore = product.calculateCompleteness()

        // Use try-catch to handle race condition on unique SKU constraint
        // This is safer than check-then-insert which has a race condition window
        return try {
            val saved = productRepository.save(product)
            logger.info("Product created: ${saved.id} (SKU: ${saved.sku})")
            saved
        } catch (e: DataIntegrityViolationException) {
            // Check if it's a duplicate SKU error
            if (e.message?.contains("sku", ignoreCase = true) == true ||
                e.message?.contains("unique", ignoreCase = true) == true) {
                logger.warn("Duplicate SKU attempted: ${product.sku}")
                throw ProductAlreadyExistsException(product.sku)
            }
            throw e
        }
    }

    @Caching(evict = [
        CacheEvict(cacheNames = [CacheConfig.PRODUCT_BY_ID_CACHE], key = "#id"),
        CacheEvict(cacheNames = [CacheConfig.PRODUCT_BY_SKU_CACHE], allEntries = true),
        CacheEvict(cacheNames = [CacheConfig.DASHBOARD_STATS_CACHE], allEntries = true)
    ])
    fun update(id: UUID, updateFn: (Product) -> Unit): Product {
        val product = productRepository.findById(id)
            .orElseThrow { ProductNotFoundException(id) }

        updateFn(product)

        // Validate price is not negative
        product.price?.let { price ->
            if (price < BigDecimal.ZERO) {
                throw IllegalArgumentException("Product price cannot be negative: $price")
            }
        }
        product.costPrice?.let { costPrice ->
            if (costPrice < BigDecimal.ZERO) {
                throw IllegalArgumentException("Product cost price cannot be negative: $costPrice")
            }
        }

        product.completenessScore = product.calculateCompleteness()

        val saved = productRepository.save(product)
        logger.info("Product updated: ${saved.id}")
        return saved
    }

    @Caching(evict = [
        CacheEvict(cacheNames = [CacheConfig.PRODUCT_BY_ID_CACHE], key = "#id"),
        CacheEvict(cacheNames = [CacheConfig.PRODUCT_BY_SKU_CACHE], allEntries = true),
        CacheEvict(cacheNames = [CacheConfig.DASHBOARD_STATS_CACHE], allEntries = true)
    ])
    fun updateStatus(id: UUID, status: ProductStatus): Product {
        return update(id) { it.status = status }
    }

    @Caching(evict = [
        CacheEvict(cacheNames = [CacheConfig.PRODUCT_BY_ID_CACHE], key = "#productId"),
        CacheEvict(cacheNames = [CacheConfig.PRODUCT_BY_SKU_CACHE], allEntries = true)
    ])
    fun addToCategory(productId: UUID, categoryId: UUID): Product {
        val product = productRepository.findById(productId)
            .orElseThrow { ProductNotFoundException(productId) }

        val category = categoryRepository.findById(categoryId)
            .orElseThrow { CategoryNotFoundException(categoryId) }

        product.categories.add(category)
        product.completenessScore = product.calculateCompleteness()

        val saved = productRepository.save(product)
        logger.info("Product ${productId} added to category ${categoryId}")
        return saved
    }

    @Caching(evict = [
        CacheEvict(cacheNames = [CacheConfig.PRODUCT_BY_ID_CACHE], key = "#productId"),
        CacheEvict(cacheNames = [CacheConfig.PRODUCT_BY_SKU_CACHE], allEntries = true)
    ])
    fun removeFromCategory(productId: UUID, categoryId: UUID): Product {
        val product = productRepository.findById(productId)
            .orElseThrow { ProductNotFoundException(productId) }

        product.categories.removeIf { it.id == categoryId }
        product.completenessScore = product.calculateCompleteness()

        val saved = productRepository.save(product)
        logger.info("Product ${productId} removed from category ${categoryId}")
        return saved
    }

    @Caching(evict = [
        CacheEvict(cacheNames = [CacheConfig.PRODUCT_BY_ID_CACHE], key = "#id"),
        CacheEvict(cacheNames = [CacheConfig.PRODUCT_BY_SKU_CACHE], allEntries = true),
        CacheEvict(cacheNames = [CacheConfig.DASHBOARD_STATS_CACHE], allEntries = true)
    ])
    fun delete(id: UUID) {
        if (!productRepository.existsById(id)) {
            throw ProductNotFoundException(id)
        }
        productRepository.deleteById(id)
        logger.info("Product deleted: $id")
    }

    /**
     * Bulk update product status using a single database query.
     * Optimized: Previously executed N individual UPDATE queries, now uses 1 batch query.
     */
    @Caching(evict = [
        CacheEvict(cacheNames = [CacheConfig.PRODUCT_BY_ID_CACHE], allEntries = true),
        CacheEvict(cacheNames = [CacheConfig.PRODUCT_BY_SKU_CACHE], allEntries = true),
        CacheEvict(cacheNames = [CacheConfig.DASHBOARD_STATS_CACHE], allEntries = true)
    ])
    fun bulkUpdateStatus(ids: List<UUID>, status: ProductStatus): Int {
        if (ids.isEmpty()) return 0

        // Use batch update for efficiency (single query instead of N queries)
        val updated = productRepository.bulkUpdateStatus(ids, status)
        logger.info("Bulk status update: $updated/${ids.size} products updated to $status")
        return updated
    }

    /**
     * Get product statistics using optimized aggregated queries.
     * Optimized: Previously executed 7 separate queries, now uses 2 queries.
     */
    @Cacheable(
        cacheNames = [CacheConfig.DASHBOARD_STATS_CACHE],
        key = "'statistics'"
    )
    @Transactional(readOnly = true)
    fun getStatistics(): ProductStatistics {
        logger.debug("Calculating product statistics")

        // Get most statistics in a single aggregated query
        val stats = productRepository.getAggregatedStatistics()

        // Only noImages needs a separate query due to subquery complexity
        val noImages = productRepository.countProductsWithoutMedia()

        return ProductStatistics(
            total = (stats[0] as Long?) ?: 0L,
            draft = (stats[1] as Long?) ?: 0L,
            pendingReview = (stats[2] as Long?) ?: 0L,
            approved = (stats[3] as Long?) ?: 0L,
            published = (stats[4] as Long?) ?: 0L,
            archived = (stats[5] as Long?) ?: 0L,
            lowStock = (stats[6] as Long?) ?: 0L,
            noImages = noImages,
            averageCompleteness = (stats[7] as Double?) ?: 0.0
        )
    }

    @Transactional(readOnly = true)
    fun findRecent(limit: Int): List<Product> {
        return productRepository.findRecentProducts(limit)
    }

    @Transactional(readOnly = true)
    fun findLowStock(threshold: Int = 10, pageable: Pageable): Page<Product> {
        return productRepository.findLowStock(threshold, pageable)
    }

    @Transactional(readOnly = true)
    fun findWithoutImages(pageable: Pageable): Page<Product> {
        return productRepository.findWithoutImages(pageable)
    }

    /**
     * Get count of products by status using a single aggregated query.
     * Optimized: Previously executed 5 separate queries (one per status), now uses 1.
     */
    @Transactional(readOnly = true)
    fun countByStatus(): Map<ProductStatus, Long> {
        // Get all counts in a single query
        val counts = productRepository.countAllByStatus()
            .associate { (it[0] as ProductStatus) to (it[1] as Long) }

        // Ensure all statuses are present in the result (with 0 for missing)
        return ProductStatus.entries.associateWith { status ->
            counts[status] ?: 0L
        }
    }

    /**
     * Evict all product-related caches.
     * Useful after bulk operations or data imports.
     */
    @Caching(evict = [
        CacheEvict(cacheNames = [CacheConfig.PRODUCT_BY_ID_CACHE], allEntries = true),
        CacheEvict(cacheNames = [CacheConfig.PRODUCT_BY_SKU_CACHE], allEntries = true),
        CacheEvict(cacheNames = [CacheConfig.PRODUCTS_CACHE], allEntries = true),
        CacheEvict(cacheNames = [CacheConfig.DASHBOARD_STATS_CACHE], allEntries = true)
    ])
    fun evictAllCaches() {
        logger.info("All product caches evicted")
    }

    /**
     * Advanced search with multiple combined filters using JPA Specifications
     */
    @Transactional(readOnly = true)
    fun advancedSearch(
        query: String?,
        categoryId: UUID?,
        brand: String?,
        minPrice: BigDecimal?,
        maxPrice: BigDecimal?,
        status: ProductStatus?,
        type: ProductType?,
        hasImages: Boolean?,
        minStock: Int?,
        maxStock: Int?,
        minCompleteness: Int?,
        maxCompleteness: Int?,
        tags: List<String>?,
        pageable: Pageable
    ): Page<Product> {
        logger.debug("Advanced search with filters: query=$query, categoryId=$categoryId, brand=$brand, status=$status, type=$type")

        val spec = Specification<Product> { root, criteriaQuery, cb ->
            val predicates = mutableListOf<Predicate>()

            // Full-text search in multiple fields
            query?.let { q ->
                val searchPattern = "%${q.lowercase()}%"
                predicates.add(
                    cb.or(
                        cb.like(cb.lower(root.get("name")), searchPattern),
                        cb.like(cb.lower(root.get("sku")), searchPattern),
                        cb.like(cb.lower(root.get("description")), searchPattern),
                        cb.like(cb.lower(root.get("shortDescription")), searchPattern)
                    )
                )
            }

            // Category filter
            categoryId?.let { catId ->
                val categoryJoin = root.join<Product, Any>("categories")
                predicates.add(cb.equal(categoryJoin.get<UUID>("id"), catId))
            }

            // Brand filter
            brand?.let { b ->
                predicates.add(cb.like(cb.lower(root.get("brand")), "%${b.lowercase()}%"))
            }

            // Price range
            minPrice?.let {
                predicates.add(cb.greaterThanOrEqualTo(root.get("price"), it))
            }
            maxPrice?.let {
                predicates.add(cb.lessThanOrEqualTo(root.get("price"), it))
            }

            // Status filter
            status?.let {
                predicates.add(cb.equal(root.get<ProductStatus>("status"), it))
            }

            // Type filter
            type?.let {
                predicates.add(cb.equal(root.get<ProductType>("type"), it))
            }

            // Images filter
            hasImages?.let { has ->
                if (has) {
                    predicates.add(cb.isNotEmpty(root.get<MutableSet<Any>>("media")))
                } else {
                    predicates.add(cb.isEmpty(root.get<MutableSet<Any>>("media")))
                }
            }

            // Stock range
            minStock?.let {
                predicates.add(cb.greaterThanOrEqualTo(root.get("stockQuantity"), it))
            }
            maxStock?.let {
                predicates.add(cb.lessThanOrEqualTo(root.get("stockQuantity"), it))
            }

            // Completeness range
            minCompleteness?.let {
                predicates.add(cb.greaterThanOrEqualTo(root.get("completenessScore"), it))
            }
            maxCompleteness?.let {
                predicates.add(cb.lessThanOrEqualTo(root.get("completenessScore"), it))
            }

            // Tags filter (search in tags field)
            tags?.let { tagList ->
                if (tagList.isNotEmpty()) {
                    val tagPredicates = tagList.map { tag ->
                        cb.like(cb.lower(root.get("tags")), "%${tag.lowercase()}%")
                    }
                    predicates.add(cb.or(*tagPredicates.toTypedArray()))
                }
            }

            // Only return root products (not variants)
            predicates.add(cb.isNull(root.get<Product>("parent")))

            cb.and(*predicates.toTypedArray())
        }

        return productRepository.findAll(spec, pageable)
    }

    /**
     * Get search suggestions for autocomplete functionality
     */
    @Transactional(readOnly = true)
    fun getSearchSuggestions(query: String, limit: Int): List<SearchSuggestion> {
        val suggestions = mutableListOf<SearchSuggestion>()

        // Search products by name and SKU
        val products = productRepository.searchWithMedia(query, PageRequest.of(0, limit))
        products.content.forEach { product ->
            val imageUrl = try {
                product.media.find { it.isMain }?.url ?: product.media.firstOrNull()?.url
            } catch (_: Exception) {
                null
            }
            suggestions.add(
                SearchSuggestion(
                    type = "product",
                    text = product.name,
                    subtext = product.sku,
                    id = product.id.toString(),
                    imageUrl = imageUrl
                )
            )
        }

        // Search categories
        val categories = categoryRepository.findByNameContainingIgnoreCase(query, PageRequest.of(0, 3))
        categories.forEach { category ->
            val productCount = productRepository.countByCategory(category.id)
            suggestions.add(
                SearchSuggestion(
                    type = "category",
                    text = category.name,
                    subtext = "$productCount produtos",
                    id = category.id.toString(),
                    imageUrl = null
                )
            )
        }

        // Get unique brands that match
        val brandsSpec = Specification<Product> { root, _, cb ->
            cb.and(
                cb.like(cb.lower(root.get("brand")), "%${query.lowercase()}%"),
                cb.isNotNull(root.get<String>("brand"))
            )
        }
        val brandsPage = productRepository.findAll(brandsSpec, PageRequest.of(0, 100))
        val uniqueBrands = brandsPage.content
            .mapNotNull { it.brand }
            .filter { it.isNotBlank() }
            .distinct()
            .take(3)

        uniqueBrands.forEach { brand ->
            suggestions.add(
                SearchSuggestion(
                    type = "brand",
                    text = brand,
                    subtext = "Marca",
                    id = brand,
                    imageUrl = null
                )
            )
        }

        return suggestions.take(limit)
    }
}

data class ProductStatistics(
    val total: Long,
    val draft: Long,
    val pendingReview: Long,
    val approved: Long,
    val published: Long,
    val archived: Long,
    val lowStock: Long,
    val noImages: Long,
    val averageCompleteness: Double
)
