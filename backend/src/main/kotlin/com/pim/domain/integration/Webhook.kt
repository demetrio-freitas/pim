package com.pim.domain.integration

import jakarta.persistence.*
import java.time.Instant
import java.util.*

@Entity
@Table(name = "webhooks")
data class Webhook(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(nullable = false)
    var name: String,

    @Column(nullable = false)
    var url: String,

    @Column(columnDefinition = "TEXT")
    var description: String? = null,

    @Column(name = "secret_key")
    var secretKey: String? = null, // Para assinatura HMAC

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: WebhookStatus = WebhookStatus.ACTIVE,

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "webhook_events", joinColumns = [JoinColumn(name = "webhook_id")])
    @Column(name = "event")
    @Enumerated(EnumType.STRING)
    var events: MutableSet<WebhookEvent> = mutableSetOf(),

    @Column(name = "retry_count")
    var retryCount: Int = 3,

    @Column(name = "timeout_seconds")
    var timeoutSeconds: Int = 30,

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "webhook_headers", joinColumns = [JoinColumn(name = "webhook_id")])
    @MapKeyColumn(name = "header_name")
    @Column(name = "header_value")
    var customHeaders: MutableMap<String, String> = mutableMapOf(),

    @Column(name = "last_triggered_at")
    var lastTriggeredAt: Instant? = null,

    @Column(name = "last_status_code")
    var lastStatusCode: Int? = null,

    @Column(name = "success_count")
    var successCount: Long = 0,

    @Column(name = "failure_count")
    var failureCount: Long = 0,

    @Column(name = "created_by")
    var createdBy: UUID? = null,

    @Column(name = "created_at", nullable = false)
    var createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()
)

enum class WebhookStatus {
    ACTIVE,
    INACTIVE,
    PAUSED // Pausado após muitas falhas
}

enum class WebhookEvent {
    // Produtos
    PRODUCT_CREATED,
    PRODUCT_UPDATED,
    PRODUCT_DELETED,
    PRODUCT_PUBLISHED,
    PRODUCT_UNPUBLISHED,

    // Categorias
    CATEGORY_CREATED,
    CATEGORY_UPDATED,
    CATEGORY_DELETED,

    // Atributos
    ATTRIBUTE_CREATED,
    ATTRIBUTE_UPDATED,
    ATTRIBUTE_DELETED,

    // Media
    MEDIA_UPLOADED,
    MEDIA_DELETED,

    // Import/Export
    IMPORT_COMPLETED,
    EXPORT_COMPLETED,

    // Workflow
    WORKFLOW_APPROVED,
    WORKFLOW_REJECTED
}

@Entity
@Table(name = "webhook_logs")
data class WebhookLog(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(name = "webhook_id", nullable = false)
    val webhookId: UUID,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    val event: WebhookEvent,

    @Column(name = "entity_id")
    val entityId: UUID? = null,

    @Column(name = "entity_type")
    val entityType: String? = null,

    @Column(columnDefinition = "TEXT")
    val payload: String,

    @Column(name = "response_status")
    var responseStatus: Int? = null,

    @Column(name = "response_body", columnDefinition = "TEXT")
    var responseBody: String? = null,

    @Column(name = "error_message", columnDefinition = "TEXT")
    var errorMessage: String? = null,

    @Column(name = "attempt_count")
    var attemptCount: Int = 1,

    @Column(nullable = false)
    var success: Boolean = false,

    @Column(name = "duration_ms")
    var durationMs: Long? = null,

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now()
)
