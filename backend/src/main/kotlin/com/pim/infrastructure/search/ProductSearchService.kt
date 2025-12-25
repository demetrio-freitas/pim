package com.pim.infrastructure.search

import com.pim.domain.product.Product
import com.pim.domain.product.ProductStatus
import com.pim.domain.product.ProductType
import org.slf4j.LoggerFactory
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.Pageable
import org.springframework.data.elasticsearch.client.elc.NativeQuery
import org.springframework.data.elasticsearch.core.ElasticsearchOperations
import org.springframework.data.elasticsearch.core.SearchHits
import org.springframework.data.elasticsearch.core.query.Criteria
import org.springframework.data.elasticsearch.core.query.CriteriaQuery
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Service
import java.util.*

@Service
@ConditionalOnProperty(value = ["elasticsearch.enabled"], havingValue = "true", matchIfMissing = false)
class ProductSearchService(
    private val productSearchRepository: ProductSearchRepository,
    private val elasticsearchOperations: ElasticsearchOperations
) {
    private val logger = LoggerFactory.getLogger(javaClass)

    fun indexProduct(product: Product) {
        try {
            val document = ProductDocument.fromProduct(product)
            productSearchRepository.save(document)
            logger.debug("Indexed product: ${product.sku}")
        } catch (e: Exception) {
            logger.error("Failed to index product ${product.sku}: ${e.message}", e)
        }
    }

    fun indexProducts(products: List<Product>) {
        try {
            val documents = products.map { ProductDocument.fromProduct(it) }
            productSearchRepository.saveAll(documents)
            logger.info("Indexed ${products.size} products")
        } catch (e: Exception) {
            logger.error("Failed to bulk index products: ${e.message}", e)
        }
    }

    fun deleteProduct(productId: UUID) {
        try {
            productSearchRepository.deleteById(productId.toString())
            logger.debug("Deleted product from index: $productId")
        } catch (e: Exception) {
            logger.error("Failed to delete product $productId from index: ${e.message}", e)
        }
    }

    fun deleteAllProducts() {
        productSearchRepository.deleteAll()
        logger.info("Deleted all products from index")
    }

    fun search(criteria: ProductSearchCriteria, pageable: Pageable): Page<ProductDocument> {
        val queryCriteria = buildCriteriaQuery(criteria)
        val query = CriteriaQuery(queryCriteria, pageable)

        val searchHits: SearchHits<ProductDocument> = elasticsearchOperations.search(
            query,
            ProductDocument::class.java
        )

        val content = searchHits.searchHits.map { it.content }
        return PageImpl(content, pageable, searchHits.totalHits)
    }

    fun simpleSearch(text: String, pageable: Pageable): Page<ProductDocument> {
        return productSearchRepository.searchByText(text, pageable)
    }

    fun findByStatus(status: ProductStatus, pageable: Pageable): Page<ProductDocument> {
        return productSearchRepository.findByStatus(status.name, pageable)
    }

    fun findByCategory(categoryId: UUID, pageable: Pageable): Page<ProductDocument> {
        return productSearchRepository.findByCategoriesContaining(categoryId.toString(), pageable)
    }

    fun findByPriceRange(minPrice: Double, maxPrice: Double, pageable: Pageable): Page<ProductDocument> {
        return productSearchRepository.findByPriceBetween(minPrice, maxPrice, pageable)
    }

    fun findInStock(pageable: Pageable): Page<ProductDocument> {
        return productSearchRepository.findByIsInStock(true, pageable)
    }

    fun findPublishedInStock(pageable: Pageable): Page<ProductDocument> {
        return productSearchRepository.findByStatusAndIsInStock(ProductStatus.PUBLISHED.name, true, pageable)
    }

    fun findByMinCompleteness(minScore: Int, pageable: Pageable): Page<ProductDocument> {
        return productSearchRepository.findByCompletenessScoreGreaterThanEqual(minScore, pageable)
    }

    private fun buildCriteriaQuery(searchCriteria: ProductSearchCriteria): Criteria {
        var criteria = Criteria()

        searchCriteria.text?.let { text ->
            criteria = criteria.and(
                Criteria("name").contains(text)
                    .or(Criteria("sku").contains(text))
                    .or(Criteria("description").contains(text))
                    .or(Criteria("searchText").contains(text))
            )
        }

        searchCriteria.status?.let { status ->
            criteria = criteria.and(Criteria("status").`is`(status.name))
        }

        searchCriteria.type?.let { type ->
            criteria = criteria.and(Criteria("type").`is`(type.name))
        }

        searchCriteria.brand?.let { brand ->
            criteria = criteria.and(Criteria("brand").`is`(brand))
        }

        searchCriteria.categoryId?.let { categoryId ->
            criteria = criteria.and(Criteria("categories").`is`(categoryId.toString()))
        }

        searchCriteria.inStock?.let { inStock ->
            criteria = criteria.and(Criteria("isInStock").`is`(inStock))
        }

        searchCriteria.minPrice?.let { minPrice ->
            criteria = criteria.and(Criteria("price").greaterThanEqual(minPrice))
        }

        searchCriteria.maxPrice?.let { maxPrice ->
            criteria = criteria.and(Criteria("price").lessThanEqual(maxPrice))
        }

        searchCriteria.minCompleteness?.let { minScore ->
            criteria = criteria.and(Criteria("completenessScore").greaterThanEqual(minScore))
        }

        return criteria
    }

    fun autocomplete(prefix: String, limit: Int = 10): List<String> {
        val criteria = Criteria("name").startsWith(prefix)
        val query = CriteriaQuery(criteria, Pageable.ofSize(limit))

        val searchHits = elasticsearchOperations.search(query, ProductDocument::class.java)
        return searchHits.searchHits.map { it.content.name }.distinct()
    }

    fun suggest(text: String, limit: Int = 5): List<ProductSuggestion> {
        val criteria = Criteria("name").fuzzy(text)
            .or(Criteria("sku").fuzzy(text))
            .or(Criteria("brand").fuzzy(text))

        val query = CriteriaQuery(criteria, Pageable.ofSize(limit))

        val searchHits = elasticsearchOperations.search(query, ProductDocument::class.java)
        return searchHits.searchHits.map { hit ->
            ProductSuggestion(
                id = hit.content.id,
                sku = hit.content.sku,
                name = hit.content.name,
                score = hit.score?.toFloat() ?: 0f
            )
        }
    }

    fun countByStatus(): Map<String, Long> {
        return ProductStatus.entries.associate { status ->
            status.name to productSearchRepository.findByStatus(status.name, Pageable.ofSize(1)).totalElements
        }
    }

    fun reindexAll(products: List<Product>) {
        logger.info("Starting full reindex of ${products.size} products")
        deleteAllProducts()
        indexProducts(products)
        logger.info("Full reindex completed")
    }
}

data class ProductSearchCriteria(
    val text: String? = null,
    val status: ProductStatus? = null,
    val type: ProductType? = null,
    val brand: String? = null,
    val categoryId: UUID? = null,
    val inStock: Boolean? = null,
    val minPrice: Double? = null,
    val maxPrice: Double? = null,
    val minCompleteness: Int? = null,
    val attributes: Map<String, String>? = null
)

data class ProductSuggestion(
    val id: String,
    val sku: String,
    val name: String,
    val score: Float
)
