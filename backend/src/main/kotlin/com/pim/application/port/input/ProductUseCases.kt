package com.pim.application.port.input

import com.pim.domain.product.Product
import com.pim.domain.product.ProductStatus
import com.pim.domain.product.ProductType
import com.pim.domain.shared.DomainResult
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import java.math.BigDecimal
import java.util.*

/**
 * Input port for Product commands (write operations).
 * Part of CQRS - handles all state-changing operations.
 */
interface ProductCommandUseCase {
    fun createProduct(command: CreateProductCommand): DomainResult<Product>
    fun updateProduct(command: UpdateProductCommand): DomainResult<Product>
    fun deleteProduct(productId: UUID): DomainResult<Unit>
    fun updateProductStatus(productId: UUID, status: ProductStatus): DomainResult<Product>
    fun bulkUpdateStatus(productIds: List<UUID>, status: ProductStatus): Int
    fun bulkDelete(productIds: List<UUID>): Int
    fun assignCategory(productId: UUID, categoryId: UUID): DomainResult<Product>
    fun removeCategory(productId: UUID, categoryId: UUID): DomainResult<Product>
    fun updateAttribute(productId: UUID, attributeCode: String, value: String): DomainResult<Product>
}

/**
 * Input port for Product queries (read operations).
 * Part of CQRS - handles all read operations.
 */
interface ProductQueryUseCase {
    fun findById(productId: UUID): Product?
    fun findBySku(sku: String): Product?
    fun findAll(pageable: Pageable): Page<Product>
    fun findByStatus(status: ProductStatus, pageable: Pageable): Page<Product>
    fun findByCategory(categoryId: UUID, pageable: Pageable): Page<Product>
    fun search(query: ProductSearchQuery, pageable: Pageable): Page<Product>
    fun getStatistics(): ProductStatistics
    fun getByIds(ids: List<UUID>): List<Product>
}

// ============================================
// Commands (Write DTOs)
// ============================================

data class CreateProductCommand(
    val sku: String,
    val name: String,
    val description: String? = null,
    val shortDescription: String? = null,
    val type: ProductType = ProductType.SIMPLE,
    val status: ProductStatus = ProductStatus.DRAFT,
    val price: BigDecimal? = null,
    val costPrice: BigDecimal? = null,
    val brand: String? = null,
    val manufacturer: String? = null,
    val categoryIds: List<UUID> = emptyList(),
    val attributes: Map<String, String> = emptyMap(),
    val metaTitle: String? = null,
    val metaDescription: String? = null,
    val metaKeywords: String? = null,
    val urlKey: String? = null
)

data class UpdateProductCommand(
    val productId: UUID,
    val name: String? = null,
    val description: String? = null,
    val shortDescription: String? = null,
    val price: BigDecimal? = null,
    val costPrice: BigDecimal? = null,
    val brand: String? = null,
    val manufacturer: String? = null,
    val metaTitle: String? = null,
    val metaDescription: String? = null,
    val metaKeywords: String? = null,
    val urlKey: String? = null,
    val stockQuantity: Int? = null,
    val isInStock: Boolean? = null
)

// ============================================
// Queries (Read DTOs)
// ============================================

data class ProductSearchQuery(
    val text: String? = null,
    val status: ProductStatus? = null,
    val type: ProductType? = null,
    val brand: String? = null,
    val categoryId: UUID? = null,
    val minPrice: BigDecimal? = null,
    val maxPrice: BigDecimal? = null,
    val inStock: Boolean? = null,
    val minCompleteness: Int? = null
)

data class ProductStatistics(
    val total: Long,
    val draft: Long,
    val pendingReview: Long,
    val approved: Long,
    val published: Long,
    val archived: Long,
    val averageCompleteness: Double
)
