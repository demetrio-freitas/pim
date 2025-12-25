package com.pim.domain.event

/**
 * Interface for publishing domain events.
 * Implementations can use different messaging systems (Kafka, RabbitMQ, etc.)
 */
interface EventPublisher {
    fun publish(event: DomainEvent)
    fun publishAll(events: List<DomainEvent>)
}

/**
 * Interface for handling domain events.
 * Implementations define how to process specific event types.
 */
interface EventHandler<T : DomainEvent> {
    fun handle(event: T)
    fun supports(event: DomainEvent): Boolean
}

/**
 * Marker interface for entities that produce domain events.
 */
interface EventSource {
    val domainEvents: MutableList<DomainEvent>

    fun registerEvent(event: DomainEvent) {
        domainEvents.add(event)
    }

    fun clearEvents(): List<DomainEvent> {
        val events = domainEvents.toList()
        domainEvents.clear()
        return events
    }
}
