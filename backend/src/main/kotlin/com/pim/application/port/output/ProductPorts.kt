package com.pim.application.port.output

import com.pim.domain.product.Product
import com.pim.domain.product.ProductStatus
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import java.util.*

/**
 * Output port for Product persistence operations.
 * This is the interface that the domain layer uses to interact with persistence.
 * The actual implementation (JPA, MongoDB, etc.) is in the infrastructure layer.
 */
interface ProductRepository {
    fun save(product: Product): Product
    fun saveAll(products: List<Product>): List<Product>
    fun findById(id: UUID): Product?
    fun findByIdWithRelations(id: UUID): Product?
    fun findBySku(sku: String): Product?
    fun findAll(pageable: Pageable): Page<Product>
    fun findByStatus(status: ProductStatus, pageable: Pageable): Page<Product>
    fun findByIds(ids: List<UUID>): List<Product>
    fun existsById(id: UUID): Boolean
    fun existsBySku(sku: String): Boolean
    fun deleteById(id: UUID)
    fun deleteAll(products: List<Product>)
    fun count(): Long
    fun countByStatus(status: ProductStatus): Long
}

/**
 * Output port for Product search operations.
 * Abstracts the search engine (Elasticsearch, etc.) from the domain.
 */
interface ProductSearchPort {
    fun index(product: Product)
    fun indexAll(products: List<Product>)
    fun delete(productId: UUID)
    fun search(criteria: SearchCriteria, pageable: Pageable): Page<ProductSearchResult>
    fun autocomplete(prefix: String, limit: Int): List<String>
    fun reindexAll()
}

/**
 * Output port for event publishing.
 * Abstracts the messaging system (Kafka, RabbitMQ, etc.) from the domain.
 */
interface ProductEventPort {
    fun publishProductCreated(product: Product, createdBy: UUID?)
    fun publishProductUpdated(product: Product, changes: Map<String, Any?>, updatedBy: UUID?)
    fun publishProductDeleted(productId: UUID, sku: String, deletedBy: UUID?)
    fun publishStatusChanged(product: Product, previousStatus: ProductStatus, newStatus: ProductStatus, changedBy: UUID?)
}

/**
 * Output port for caching operations.
 */
interface ProductCachePort {
    fun get(key: String): Product?
    fun put(key: String, product: Product)
    fun evict(key: String)
    fun evictAll()
}

// ============================================
// DTOs for Search Port
// ============================================

data class SearchCriteria(
    val text: String? = null,
    val status: String? = null,
    val type: String? = null,
    val brand: String? = null,
    val categoryId: UUID? = null,
    val minPrice: Double? = null,
    val maxPrice: Double? = null,
    val inStock: Boolean? = null,
    val minCompleteness: Int? = null
)

data class ProductSearchResult(
    val id: UUID,
    val sku: String,
    val name: String,
    val description: String?,
    val price: Double?,
    val status: String,
    val type: String,
    val brand: String?,
    val completenessScore: Int,
    val score: Float
)
