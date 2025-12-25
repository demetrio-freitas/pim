package com.pim.domain.mercadolivre

import jakarta.persistence.*
import java.time.Instant
import java.util.*

@Entity
@Table(
    name = "ml_product_mappings",
    uniqueConstraints = [
        UniqueConstraint(columnNames = ["account_id", "product_id"]),
        UniqueConstraint(columnNames = ["account_id", "ml_item_id"])
    ]
)
data class MLProductMapping(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(name = "account_id", nullable = false)
    val accountId: UUID,

    @Column(name = "product_id", nullable = false)
    val productId: UUID,

    @Column(name = "ml_item_id", nullable = false)
    var mlItemId: String,

    @Column(name = "ml_permalink")
    var mlPermalink: String? = null,

    @Column(name = "ml_category_id")
    var mlCategoryId: String? = null,

    @Column(name = "ml_category_name")
    var mlCategoryName: String? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "listing_type")
    var listingType: MLListingType = MLListingType.GOLD_SPECIAL,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: MLMappingStatus = MLMappingStatus.ACTIVE,

    @Column(name = "ml_status")
    var mlStatus: String? = null, // active, paused, closed, under_review

    // Pricing info from ML
    @Column(name = "ml_price")
    var mlPrice: java.math.BigDecimal? = null,

    @Column(name = "ml_original_price")
    var mlOriginalPrice: java.math.BigDecimal? = null,

    @Column(name = "ml_currency")
    var mlCurrency: String = "BRL",

    // Stock info from ML
    @Column(name = "ml_available_quantity")
    var mlAvailableQuantity: Int = 0,

    @Column(name = "ml_sold_quantity")
    var mlSoldQuantity: Int = 0,

    // Shipping
    @Column(name = "free_shipping")
    var freeShipping: Boolean = false,

    @Column(name = "shipping_mode")
    var shippingMode: String? = null,

    // Health
    @Column(name = "health_score")
    var healthScore: Int? = null,

    @Column(name = "health_issues", columnDefinition = "TEXT")
    var healthIssues: String? = null, // JSON array of issues

    // Sync info
    @Column(name = "last_synced_at")
    var lastSyncedAt: Instant? = null,

    @Column(name = "last_sync_direction")
    var lastSyncDirection: String? = null, // pim_to_ml, ml_to_pim

    @Column(name = "sync_error", columnDefinition = "TEXT")
    var syncError: String? = null,

    // Audit
    @Column(name = "created_at", nullable = false)
    var createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()
)

enum class MLMappingStatus {
    ACTIVE,
    PENDING_SYNC,
    SYNC_ERROR,
    PAUSED,
    CLOSED,
    DELETED_IN_ML,
    DELETED_IN_PIM
}
