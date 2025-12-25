package com.pim.domain.shopify

import jakarta.persistence.*
import java.time.Instant
import java.util.*

@Entity
@Table(name = "shopify_sync_logs")
data class ShopifySyncLog(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(name = "store_id", nullable = false)
    val storeId: UUID,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var type: SyncLogType,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: SyncStatus = SyncStatus.IN_PROGRESS,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var direction: SyncDirection,

    // What was synced
    @Column(name = "entity_type")
    var entityType: String? = null, // product, category, inventory

    @Column(name = "entity_id")
    var entityId: UUID? = null,

    @Column(name = "shopify_id")
    var shopifyId: String? = null,

    // Stats
    @Column(name = "items_processed")
    var itemsProcessed: Int = 0,

    @Column(name = "items_created")
    var itemsCreated: Int = 0,

    @Column(name = "items_updated")
    var itemsUpdated: Int = 0,

    @Column(name = "items_failed")
    var itemsFailed: Int = 0,

    @Column(name = "items_skipped")
    var itemsSkipped: Int = 0,

    // Timing
    @Column(name = "started_at", nullable = false)
    var startedAt: Instant = Instant.now(),

    @Column(name = "completed_at")
    var completedAt: Instant? = null,

    @Column(name = "duration_ms")
    var durationMs: Long? = null,

    // Details
    @Column(columnDefinition = "TEXT")
    var message: String? = null,

    @Column(name = "error_details", columnDefinition = "TEXT")
    var errorDetails: String? = null,

    @Column(name = "request_payload", columnDefinition = "TEXT")
    var requestPayload: String? = null,

    @Column(name = "response_payload", columnDefinition = "TEXT")
    var responsePayload: String? = null,

    // Trigger info
    @Column(name = "triggered_by")
    var triggeredBy: String? = null, // manual, scheduled, webhook

    @Column(name = "triggered_by_user_id")
    var triggeredByUserId: UUID? = null
) {
    fun complete(newStatus: SyncStatus, newMessage: String? = null) {
        this.status = newStatus
        this.completedAt = Instant.now()
        this.durationMs = completedAt!!.toEpochMilli() - startedAt.toEpochMilli()
        this.message = newMessage
    }

    fun fail(error: String, details: String? = null) {
        this.status = SyncStatus.FAILED
        this.completedAt = Instant.now()
        this.durationMs = completedAt!!.toEpochMilli() - startedAt.toEpochMilli()
        this.message = error
        this.errorDetails = details
    }
}

enum class SyncLogType {
    FULL_SYNC,           // Complete sync of all products
    INCREMENTAL_SYNC,    // Only changed products
    SINGLE_PRODUCT,      // Single product sync
    INVENTORY_UPDATE,    // Inventory only
    PRICE_UPDATE,        // Prices only
    WEBHOOK_RECEIVED,    // Incoming webhook from Shopify
    MANUAL_PUSH,         // Manual push to Shopify
    MANUAL_PULL          // Manual pull from Shopify
}
