package com.pim.infrastructure.messaging

import com.pim.config.KafkaConfig
import com.pim.domain.event.*
import org.slf4j.LoggerFactory
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.kafka.core.KafkaTemplate
import org.springframework.kafka.support.SendResult
import org.springframework.stereotype.Component
import java.util.concurrent.CompletableFuture

@Component
@ConditionalOnProperty(value = ["kafka.enabled"], havingValue = "true", matchIfMissing = false)
class KafkaEventPublisher(
    private val kafkaTemplate: KafkaTemplate<String, Any>
) : EventPublisher {

    private val logger = LoggerFactory.getLogger(javaClass)

    override fun publish(event: DomainEvent) {
        val topic = resolveTopicForEvent(event)
        val key = event.aggregateId.toString()

        val eventEnvelope = EventEnvelope(
            eventId = event.eventId.toString(),
            eventType = event.eventType,
            aggregateId = event.aggregateId.toString(),
            aggregateType = event.aggregateType,
            occurredAt = event.occurredAt.toString(),
            version = event.version,
            data = event.toEventData()
        )

        logger.debug("Publishing event {} to topic {} with key {}", event.eventType, topic, key)

        val future: CompletableFuture<SendResult<String, Any>> = kafkaTemplate.send(topic, key, eventEnvelope)

        future.whenComplete { result, exception ->
            if (exception != null) {
                logger.error("Failed to publish event {} to topic {}: {}",
                    event.eventType, topic, exception.message, exception)
            } else {
                val metadata = result.recordMetadata
                logger.info("Published event {} to topic {} partition {} offset {}",
                    event.eventType, metadata.topic(), metadata.partition(), metadata.offset())
            }
        }
    }

    override fun publishAll(events: List<DomainEvent>) {
        events.forEach { publish(it) }
    }

    private fun resolveTopicForEvent(event: DomainEvent): String {
        return when (event) {
            is ProductEvent -> KafkaConfig.PRODUCT_EVENTS_TOPIC
            is CategoryEvent -> KafkaConfig.CATEGORY_EVENTS_TOPIC
            is ImportExportEvent -> KafkaConfig.IMPORT_EVENTS_TOPIC
            else -> throw IllegalArgumentException("Unknown event type: ${event::class.simpleName}")
        }
    }
}

/**
 * Event envelope for serialization/deserialization
 */
data class EventEnvelope(
    val eventId: String,
    val eventType: String,
    val aggregateId: String,
    val aggregateType: String,
    val occurredAt: String,
    val version: Int,
    val data: Map<String, Any?>
)
