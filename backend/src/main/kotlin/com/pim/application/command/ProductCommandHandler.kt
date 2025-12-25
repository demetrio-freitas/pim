package com.pim.application.command

import com.pim.application.port.input.*
import com.pim.application.port.output.ProductEventPort
import com.pim.application.port.output.ProductRepository
import com.pim.domain.event.EventPublisher
import com.pim.domain.event.ProductCreatedEvent
import com.pim.domain.event.ProductDeletedEvent
import com.pim.domain.event.ProductStatusChangedEvent
import com.pim.domain.product.Product
import com.pim.domain.product.ProductStatus
import com.pim.domain.shared.*
import com.pim.infrastructure.persistence.CategoryRepository
import org.slf4j.LoggerFactory
import org.springframework.cache.annotation.CacheEvict
import org.springframework.cache.annotation.Caching
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

/**
 * Command handler for Product write operations.
 * Implements the ProductCommandUseCase port with all business logic.
 */
@Service
@Transactional
class ProductCommandHandler(
    private val productRepository: com.pim.infrastructure.persistence.ProductRepository,
    private val categoryRepository: CategoryRepository,
    private val eventPublisher: EventPublisher
) : ProductCommandUseCase {

    private val logger = LoggerFactory.getLogger(javaClass)

    @Caching(evict = [
        CacheEvict(value = ["products"], allEntries = true),
        CacheEvict(value = ["dashboardStats"], allEntries = true)
    ])
    override fun createProduct(command: CreateProductCommand): DomainResult<Product> {
        logger.debug("Creating product with SKU: {}", command.sku)

        // Validate command
        val validation = validateCreateCommand(command)
        if (validation.isFailure) {
            @Suppress("UNCHECKED_CAST")
            return validation as DomainResult<Product>
        }

        // Check for duplicate SKU
        if (productRepository.existsBySku(command.sku)) {
            return Result.failure(ProductAlreadyExistsException(command.sku))
        }

        // Create product entity
        val product = Product(
            sku = command.sku,
            name = command.name,
            description = command.description,
            shortDescription = command.shortDescription,
            type = command.type,
            status = command.status,
            price = command.price,
            costPrice = command.costPrice,
            brand = command.brand,
            manufacturer = command.manufacturer,
            metaTitle = command.metaTitle,
            metaDescription = command.metaDescription,
            metaKeywords = command.metaKeywords,
            urlKey = command.urlKey ?: generateUrlKey(command.name)
        )

        // Assign categories
        if (command.categoryIds.isNotEmpty()) {
            val categories = categoryRepository.findAllById(command.categoryIds)
            product.categories.addAll(categories)
        }

        // Calculate completeness
        product.completenessScore = product.calculateCompleteness()

        // Save product
        val savedProduct = productRepository.save(product)

        // Publish event
        eventPublisher.publish(
            ProductCreatedEvent(
                productId = savedProduct.id,
                sku = savedProduct.sku,
                name = savedProduct.name,
                type = savedProduct.type.name,
                createdBy = null // TODO: Get from security context
            )
        )

        logger.info("Product created: {} ({})", savedProduct.sku, savedProduct.id)
        return Result.success(savedProduct)
    }

    @Caching(evict = [
        CacheEvict(value = ["productById"], key = "#command.productId"),
        CacheEvict(value = ["products"], allEntries = true)
    ])
    override fun updateProduct(command: UpdateProductCommand): DomainResult<Product> {
        logger.debug("Updating product: {}", command.productId)

        val product = productRepository.findById(command.productId).orElse(null)
            ?: return Result.failure(ProductNotFoundException(command.productId))

        // Apply updates
        command.name?.let { product.name = it }
        command.description?.let { product.description = it }
        command.shortDescription?.let { product.shortDescription = it }
        command.price?.let { product.price = it }
        command.costPrice?.let { product.costPrice = it }
        command.brand?.let { product.brand = it }
        command.manufacturer?.let { product.manufacturer = it }
        command.metaTitle?.let { product.metaTitle = it }
        command.metaDescription?.let { product.metaDescription = it }
        command.metaKeywords?.let { product.metaKeywords = it }
        command.urlKey?.let { product.urlKey = it }
        command.stockQuantity?.let { product.stockQuantity = it }
        command.isInStock?.let { product.isInStock = it }

        // Recalculate completeness
        product.completenessScore = product.calculateCompleteness()

        val savedProduct = productRepository.save(product)
        logger.info("Product updated: {} ({})", savedProduct.sku, savedProduct.id)

        return Result.success(savedProduct)
    }

    @Caching(evict = [
        CacheEvict(value = ["productById"], key = "#productId"),
        CacheEvict(value = ["products"], allEntries = true),
        CacheEvict(value = ["dashboardStats"], allEntries = true)
    ])
    override fun deleteProduct(productId: UUID): DomainResult<Unit> {
        logger.debug("Deleting product: {}", productId)

        val product = productRepository.findById(productId).orElse(null)
            ?: return Result.failure(ProductNotFoundException(productId))

        productRepository.deleteById(productId)

        eventPublisher.publish(
            ProductDeletedEvent(
                productId = productId,
                sku = product.sku,
                deletedBy = null
            )
        )

        logger.info("Product deleted: {} ({})", product.sku, productId)
        return Result.success(Unit)
    }

    @Caching(evict = [
        CacheEvict(value = ["productById"], key = "#productId"),
        CacheEvict(value = ["products"], allEntries = true),
        CacheEvict(value = ["dashboardStats"], allEntries = true)
    ])
    override fun updateProductStatus(productId: UUID, status: ProductStatus): DomainResult<Product> {
        logger.debug("Updating product status: {} -> {}", productId, status)

        val product = productRepository.findById(productId).orElse(null)
            ?: return Result.failure(ProductNotFoundException(productId))

        val previousStatus = product.status

        // Validate state transition
        if (!isValidStatusTransition(previousStatus, status)) {
            return Result.failure(
                InvalidStateTransitionException("Product", previousStatus.name, status.name)
            )
        }

        product.status = status
        val savedProduct = productRepository.save(product)

        eventPublisher.publish(
            ProductStatusChangedEvent(
                productId = productId,
                previousStatus = previousStatus.name,
                newStatus = status.name,
                changedBy = null
            )
        )

        logger.info("Product status updated: {} from {} to {}", product.sku, previousStatus, status)
        return Result.success(savedProduct)
    }

    @CacheEvict(value = ["products", "dashboardStats"], allEntries = true)
    override fun bulkUpdateStatus(productIds: List<UUID>, status: ProductStatus): Int {
        logger.debug("Bulk updating {} products to status {}", productIds.size, status)

        var updatedCount = 0
        productIds.forEach { productId ->
            val result = updateProductStatus(productId, status)
            if (result.isSuccess) updatedCount++
        }

        logger.info("Bulk status update completed: {}/{} products updated", updatedCount, productIds.size)
        return updatedCount
    }

    @CacheEvict(value = ["products", "dashboardStats"], allEntries = true)
    override fun bulkDelete(productIds: List<UUID>): Int {
        logger.debug("Bulk deleting {} products", productIds.size)

        var deletedCount = 0
        productIds.forEach { productId ->
            val result = deleteProduct(productId)
            if (result.isSuccess) deletedCount++
        }

        logger.info("Bulk delete completed: {}/{} products deleted", deletedCount, productIds.size)
        return deletedCount
    }

    @CacheEvict(value = ["productById"], key = "#productId")
    override fun assignCategory(productId: UUID, categoryId: UUID): DomainResult<Product> {
        val product = productRepository.findById(productId).orElse(null)
            ?: return Result.failure(ProductNotFoundException(productId))

        val category = categoryRepository.findById(categoryId).orElse(null)
            ?: return Result.failure(CategoryNotFoundException(categoryId))

        product.categories.add(category)
        product.completenessScore = product.calculateCompleteness()

        val savedProduct = productRepository.save(product)
        return Result.success(savedProduct)
    }

    @CacheEvict(value = ["productById"], key = "#productId")
    override fun removeCategory(productId: UUID, categoryId: UUID): DomainResult<Product> {
        val product = productRepository.findById(productId).orElse(null)
            ?: return Result.failure(ProductNotFoundException(productId))

        product.categories.removeIf { it.id == categoryId }
        product.completenessScore = product.calculateCompleteness()

        val savedProduct = productRepository.save(product)
        return Result.success(savedProduct)
    }

    @CacheEvict(value = ["productById"], key = "#productId")
    override fun updateAttribute(productId: UUID, attributeCode: String, value: String): DomainResult<Product> {
        val product = productRepository.findById(productId).orElse(null)
            ?: return Result.failure(ProductNotFoundException(productId))

        val attr = product.attributes.find { it.attribute.code == attributeCode }
        if (attr != null) {
            attr.setValue(value)
        } else {
            return Result.failure(AttributeNotFoundByCodeException(attributeCode))
        }

        val savedProduct = productRepository.save(product)
        return Result.success(savedProduct)
    }

    // ============================================
    // Private Helper Methods
    // ============================================

    private fun validateCreateCommand(command: CreateProductCommand): DomainResult<CreateProductCommand> {
        return validate(command) {
            requireNotBlank(command.sku, "sku", "SKU is required")
            requireNotBlank(command.name, "name", "Name is required")
            requireMaxLength(command.sku, "sku", 100)
            requireMaxLength(command.name, "name", 255)
            requirePattern(command.sku, "sku", Regex("^[A-Za-z0-9-_]+$"), "SKU must contain only alphanumeric characters, hyphens, and underscores")
        }
    }

    private fun isValidStatusTransition(from: ProductStatus, to: ProductStatus): Boolean {
        val allowedTransitions = mapOf(
            ProductStatus.DRAFT to setOf(ProductStatus.PENDING_REVIEW, ProductStatus.ARCHIVED),
            ProductStatus.PENDING_REVIEW to setOf(ProductStatus.APPROVED, ProductStatus.DRAFT),
            ProductStatus.APPROVED to setOf(ProductStatus.PUBLISHED, ProductStatus.DRAFT),
            ProductStatus.PUBLISHED to setOf(ProductStatus.ARCHIVED, ProductStatus.DRAFT),
            ProductStatus.ARCHIVED to setOf(ProductStatus.DRAFT)
        )

        return allowedTransitions[from]?.contains(to) ?: false
    }

    private fun generateUrlKey(name: String): String {
        return name.lowercase()
            .replace(Regex("[^a-z0-9\\s-]"), "")
            .replace(Regex("\\s+"), "-")
            .take(100)
    }
}
