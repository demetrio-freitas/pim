package com.pim.application

import com.pim.infrastructure.persistence.ProductRepository
import com.pim.infrastructure.search.ProductSearchService
import org.slf4j.LoggerFactory
import org.springframework.data.domain.PageRequest
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Service

@Service
@ConditionalOnProperty(value = ["elasticsearch.enabled"], havingValue = "true", matchIfMissing = false)
class SearchAdminService(
    private val productRepository: ProductRepository,
    private val productSearchService: ProductSearchService
) {
    private val logger = LoggerFactory.getLogger(javaClass)

    @Async
    fun reindexAllProducts() {
        logger.info("Starting full product reindex...")

        var page = 0
        val pageSize = 100
        var totalIndexed = 0

        productSearchService.deleteAllProducts()

        do {
            val products = productRepository.findAll(PageRequest.of(page, pageSize))
            if (products.hasContent()) {
                productSearchService.indexProducts(products.content)
                totalIndexed += products.content.size
                logger.info("Indexed page $page: ${products.content.size} products (total: $totalIndexed)")
            }
            page++
        } while (products.hasNext())

        logger.info("Full reindex completed. Total indexed: $totalIndexed products")
    }

    fun getIndexStats(): IndexStats {
        val totalInDb = productRepository.count()
        val countByStatus = productSearchService.countByStatus()
        val totalInIndex = countByStatus.values.sum()

        return IndexStats(
            totalInDatabase = totalInDb,
            totalInIndex = totalInIndex,
            countByStatus = countByStatus,
            isSynced = totalInDb == totalInIndex
        )
    }
}

data class IndexStats(
    val totalInDatabase: Long,
    val totalInIndex: Long,
    val countByStatus: Map<String, Long>,
    val isSynced: Boolean
)
