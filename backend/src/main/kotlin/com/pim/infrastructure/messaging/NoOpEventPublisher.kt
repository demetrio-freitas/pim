package com.pim.infrastructure.messaging

import com.pim.domain.event.DomainEvent
import com.pim.domain.event.EventPublisher
import org.slf4j.LoggerFactory
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.ApplicationEventPublisher
import org.springframework.stereotype.Component

/**
 * Fallback event publisher when Kafka is disabled.
 * Uses Spring's internal ApplicationEventPublisher for local event handling.
 */
@Component
@ConditionalOnProperty(value = ["kafka.enabled"], havingValue = "false", matchIfMissing = true)
class NoOpEventPublisher(
    private val applicationEventPublisher: ApplicationEventPublisher
) : EventPublisher {

    private val logger = LoggerFactory.getLogger(javaClass)

    override fun publish(event: DomainEvent) {
        logger.debug("Publishing event locally (Kafka disabled): {} - {}", event.eventType, event.aggregateId)
        applicationEventPublisher.publishEvent(event)
    }

    override fun publishAll(events: List<DomainEvent>) {
        events.forEach { publish(it) }
    }
}
