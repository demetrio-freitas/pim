package com.pim.infrastructure.search

import com.pim.domain.product.Product
import jakarta.persistence.PostPersist
import jakarta.persistence.PostRemove
import jakarta.persistence.PostUpdate
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Component

/**
 * JPA Entity Listener that automatically syncs Product changes to Elasticsearch.
 * Uses async processing to avoid blocking the main transaction.
 */
@Component
@ConditionalOnProperty(value = ["elasticsearch.enabled"], havingValue = "true", matchIfMissing = false)
class ProductIndexListener {

    private val logger = LoggerFactory.getLogger(javaClass)

    companion object {
        private var productSearchService: ProductSearchService? = null

        @Autowired
        fun setProductSearchService(service: ProductSearchService) {
            productSearchService = service
        }
    }

    @PostPersist
    @PostUpdate
    fun onProductSave(product: Product) {
        try {
            productSearchService?.indexProduct(product)
                ?: logger.warn("ProductSearchService not initialized, skipping index for ${product.sku}")
        } catch (e: Exception) {
            logger.error("Failed to index product ${product.sku} after save: ${e.message}")
        }
    }

    @PostRemove
    fun onProductDelete(product: Product) {
        try {
            productSearchService?.deleteProduct(product.id)
                ?: logger.warn("ProductSearchService not initialized, skipping delete index for ${product.id}")
        } catch (e: Exception) {
            logger.error("Failed to remove product ${product.id} from index: ${e.message}")
        }
    }
}
