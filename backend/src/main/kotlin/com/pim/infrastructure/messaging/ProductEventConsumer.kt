package com.pim.infrastructure.messaging

import com.pim.config.KafkaConfig
import com.pim.infrastructure.search.ProductSearchService
import org.apache.kafka.clients.consumer.ConsumerRecord
import org.slf4j.LoggerFactory
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.kafka.annotation.KafkaListener
import org.springframework.kafka.support.Acknowledgment
import org.springframework.stereotype.Component

@Component
@ConditionalOnProperty(value = ["kafka.enabled"], havingValue = "true", matchIfMissing = false)
class ProductEventConsumer(
    private val productSearchService: ProductSearchService
) {
    private val logger = LoggerFactory.getLogger(javaClass)

    @KafkaListener(
        topics = [KafkaConfig.PRODUCT_EVENTS_TOPIC],
        groupId = "\${spring.kafka.consumer.group-id:pim-search-indexer}",
        containerFactory = "kafkaListenerContainerFactory"
    )
    fun handleProductEvent(record: ConsumerRecord<String, EventEnvelope>, acknowledgment: Acknowledgment) {
        val envelope = record.value()
        logger.info("Received product event: {} for aggregate {}", envelope.eventType, envelope.aggregateId)

        try {
            when (envelope.eventType) {
                "ProductCreated", "ProductUpdated", "ProductStatusChanged", "ProductAttributeChanged" -> {
                    // Trigger re-index for the product
                    logger.debug("Triggering search index update for product {}", envelope.aggregateId)
                    // The actual indexing happens through the ProductService which has access to the full product
                }
                "ProductDeleted" -> {
                    logger.debug("Removing product {} from search index", envelope.aggregateId)
                    productSearchService.deleteProduct(java.util.UUID.fromString(envelope.aggregateId))
                }
                else -> {
                    logger.warn("Unknown product event type: {}", envelope.eventType)
                }
            }
            acknowledgment.acknowledge()
        } catch (e: Exception) {
            logger.error("Error processing product event {}: {}", envelope.eventId, e.message, e)
            // Don't acknowledge - message will be redelivered
            throw e
        }
    }
}

@Component
@ConditionalOnProperty(value = ["kafka.enabled"], havingValue = "true", matchIfMissing = false)
class ImportEventConsumer {
    private val logger = LoggerFactory.getLogger(javaClass)

    @KafkaListener(
        topics = [KafkaConfig.IMPORT_EVENTS_TOPIC],
        groupId = "\${spring.kafka.consumer.group-id:pim-import-processor}",
        containerFactory = "kafkaListenerContainerFactory"
    )
    fun handleImportEvent(record: ConsumerRecord<String, EventEnvelope>, acknowledgment: Acknowledgment) {
        val envelope = record.value()
        logger.info("Received import event: {} for job {}", envelope.eventType, envelope.aggregateId)

        try {
            when (envelope.eventType) {
                "ImportStarted" -> {
                    logger.info("Import job {} started - File: {}, Total records: {}",
                        envelope.aggregateId,
                        envelope.data["fileName"],
                        envelope.data["totalRecords"])
                }
                "ImportCompleted" -> {
                    logger.info("Import job {} completed - Success: {}, Errors: {}, Duration: {}ms",
                        envelope.aggregateId,
                        envelope.data["successCount"],
                        envelope.data["errorCount"],
                        envelope.data["durationMs"])
                }
                "ImportFailed" -> {
                    logger.error("Import job {} failed - Reason: {}, Processed: {}",
                        envelope.aggregateId,
                        envelope.data["reason"],
                        envelope.data["processedCount"])
                }
                else -> {
                    logger.warn("Unknown import event type: {}", envelope.eventType)
                }
            }
            acknowledgment.acknowledge()
        } catch (e: Exception) {
            logger.error("Error processing import event {}: {}", envelope.eventId, e.message, e)
            throw e
        }
    }
}

@Component
@ConditionalOnProperty(value = ["kafka.enabled"], havingValue = "true", matchIfMissing = false)
class QualityEventConsumer {
    private val logger = LoggerFactory.getLogger(javaClass)

    @KafkaListener(
        topics = [KafkaConfig.QUALITY_EVENTS_TOPIC],
        groupId = "\${spring.kafka.consumer.group-id:pim-quality-processor}",
        containerFactory = "kafkaListenerContainerFactory"
    )
    fun handleQualityEvent(record: ConsumerRecord<String, EventEnvelope>, acknowledgment: Acknowledgment) {
        val envelope = record.value()
        logger.info("Received quality event: {} for product {}", envelope.eventType, envelope.aggregateId)

        try {
            when (envelope.eventType) {
                "QualityCheckCompleted" -> {
                    val score = envelope.data["score"] as? Int ?: 0
                    @Suppress("UNCHECKED_CAST")
                    val violations = envelope.data["violations"] as? List<String> ?: emptyList()

                    if (violations.isNotEmpty()) {
                        logger.warn("Product {} has {} quality violations. Score: {}",
                            envelope.aggregateId, violations.size, score)
                    } else {
                        logger.info("Product {} passed quality check with score {}",
                            envelope.aggregateId, score)
                    }
                }
                else -> {
                    logger.warn("Unknown quality event type: {}", envelope.eventType)
                }
            }
            acknowledgment.acknowledge()
        } catch (e: Exception) {
            logger.error("Error processing quality event {}: {}", envelope.eventId, e.message, e)
            throw e
        }
    }
}
