package com.pim.application.query

import com.pim.application.port.input.ProductQueryUseCase
import com.pim.application.port.input.ProductSearchQuery
import com.pim.application.port.input.ProductStatistics
import com.pim.domain.product.Product
import com.pim.domain.product.ProductStatus
import com.pim.infrastructure.persistence.ProductRepository
import org.slf4j.LoggerFactory
import org.springframework.cache.annotation.Cacheable
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.domain.Specification
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

/**
 * Query handler for Product read operations.
 * Implements the ProductQueryUseCase port with optimized read paths.
 */
@Service
@Transactional(readOnly = true)
class ProductQueryHandler(
    private val productRepository: ProductRepository
) : ProductQueryUseCase {

    private val logger = LoggerFactory.getLogger(javaClass)

    @Cacheable(value = ["productById"], key = "#productId", unless = "#result == null")
    override fun findById(productId: UUID): Product? {
        logger.debug("Finding product by ID: {}", productId)
        // Split queries to avoid MultipleBagFetchException
        val product = productRepository.findByIdWithCategories(productId) ?: return null
        productRepository.findByIdWithAttributes(productId)
        productRepository.findByIdWithMedia(productId)
        return product
    }

    @Cacheable(value = ["productBySku"], key = "#sku", unless = "#result == null")
    override fun findBySku(sku: String): Product? {
        logger.debug("Finding product by SKU: {}", sku)
        return productRepository.findBySku(sku)
    }

    override fun findAll(pageable: Pageable): Page<Product> {
        logger.debug("Finding all products, page: {}", pageable.pageNumber)
        return productRepository.findAll(pageable)
    }

    override fun findByStatus(status: ProductStatus, pageable: Pageable): Page<Product> {
        logger.debug("Finding products by status: {}", status)
        return productRepository.findByStatus(status, pageable)
    }

    override fun findByCategory(categoryId: UUID, pageable: Pageable): Page<Product> {
        logger.debug("Finding products by category: {}", categoryId)
        return productRepository.findByCategoriesId(categoryId, pageable)
    }

    override fun search(query: ProductSearchQuery, pageable: Pageable): Page<Product> {
        logger.debug("Searching products with query: {}", query)

        val spec = buildSpecification(query)
        return productRepository.findAll(spec, pageable)
    }

    @Cacheable(value = ["dashboardStats"])
    override fun getStatistics(): ProductStatistics {
        logger.debug("Getting product statistics")

        val total = productRepository.count()
        val draft = productRepository.countByStatus(ProductStatus.DRAFT)
        val pendingReview = productRepository.countByStatus(ProductStatus.PENDING_REVIEW)
        val approved = productRepository.countByStatus(ProductStatus.APPROVED)
        val published = productRepository.countByStatus(ProductStatus.PUBLISHED)
        val archived = productRepository.countByStatus(ProductStatus.ARCHIVED)

        val avgCompleteness = productRepository.getAverageCompleteness() ?: 0.0

        return ProductStatistics(
            total = total,
            draft = draft,
            pendingReview = pendingReview,
            approved = approved,
            published = published,
            archived = archived,
            averageCompleteness = avgCompleteness
        )
    }

    override fun getByIds(ids: List<UUID>): List<Product> {
        logger.debug("Finding products by IDs: {}", ids.size)
        return productRepository.findAllById(ids)
    }

    // ============================================
    // Private Helper Methods
    // ============================================

    private fun buildSpecification(query: ProductSearchQuery): Specification<Product> {
        var spec = Specification.where<Product>(null)

        query.text?.let { text ->
            spec = spec.and { root, _, cb ->
                cb.or(
                    cb.like(cb.lower(root.get("name")), "%${text.lowercase()}%"),
                    cb.like(cb.lower(root.get("sku")), "%${text.lowercase()}%"),
                    cb.like(cb.lower(root.get("description")), "%${text.lowercase()}%")
                )
            }
        }

        query.status?.let { status ->
            spec = spec.and { root, _, cb ->
                cb.equal(root.get<ProductStatus>("status"), status)
            }
        }

        query.type?.let { type ->
            spec = spec.and { root, _, cb ->
                cb.equal(root.get<String>("type"), type)
            }
        }

        query.brand?.let { brand ->
            spec = spec.and { root, _, cb ->
                cb.equal(cb.lower(root.get("brand")), brand.lowercase())
            }
        }

        query.categoryId?.let { categoryId ->
            spec = spec.and { root, _, cb ->
                val categories = root.join<Product, Any>("categories")
                cb.equal(categories.get<UUID>("id"), categoryId)
            }
        }

        query.minPrice?.let { minPrice ->
            spec = spec.and { root, _, cb ->
                cb.greaterThanOrEqualTo(root.get("price"), minPrice)
            }
        }

        query.maxPrice?.let { maxPrice ->
            spec = spec.and { root, _, cb ->
                cb.lessThanOrEqualTo(root.get("price"), maxPrice)
            }
        }

        query.inStock?.let { inStock ->
            spec = spec.and { root, _, cb ->
                cb.equal(root.get<Boolean>("isInStock"), inStock)
            }
        }

        query.minCompleteness?.let { minCompleteness ->
            spec = spec.and { root, _, cb ->
                cb.greaterThanOrEqualTo(root.get("completenessScore"), minCompleteness)
            }
        }

        return spec
    }
}
