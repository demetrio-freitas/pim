package com.pim.domain.shopify

import jakarta.persistence.*
import java.time.Instant
import java.util.*

@Entity
@Table(
    name = "shopify_product_mappings",
    uniqueConstraints = [
        UniqueConstraint(columnNames = ["store_id", "product_id"]),
        UniqueConstraint(columnNames = ["store_id", "shopify_product_id"])
    ]
)
data class ShopifyProductMapping(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(name = "store_id", nullable = false)
    val storeId: UUID,

    @Column(name = "product_id", nullable = false)
    val productId: UUID,

    @Column(name = "shopify_product_id", nullable = false)
    var shopifyProductId: String,

    @Column(name = "shopify_variant_id")
    var shopifyVariantId: String? = null,

    @Column(name = "shopify_inventory_item_id")
    var shopifyInventoryItemId: String? = null,

    @Column(name = "shopify_handle")
    var shopifyHandle: String? = null,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: MappingStatus = MappingStatus.ACTIVE,

    // Last sync info
    @Column(name = "last_synced_at")
    var lastSyncedAt: Instant? = null,

    @Column(name = "last_sync_direction")
    @Enumerated(EnumType.STRING)
    var lastSyncDirection: SyncDirection? = null,

    // Version control for conflict detection
    @Column(name = "pim_version")
    var pimVersion: Long = 0,

    @Column(name = "shopify_version")
    var shopifyVersion: Long = 0,

    @Column(name = "shopify_updated_at")
    var shopifyUpdatedAt: Instant? = null,

    // Audit
    @Column(name = "created_at", nullable = false)
    var createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()
)

enum class MappingStatus {
    ACTIVE,
    PENDING_SYNC,
    SYNC_ERROR,
    DELETED_IN_SHOPIFY,
    DELETED_IN_PIM
}
