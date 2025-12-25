package com.pim.domain.amazon

import jakarta.persistence.*
import java.time.Instant
import java.util.*

@Entity
@Table(name = "amazon_accounts")
data class AmazonAccount(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(nullable = false)
    var name: String,

    @Column(name = "seller_id", nullable = false, unique = true)
    var sellerId: String,

    @Column(name = "marketplace_id", nullable = false)
    var marketplaceId: String = "A2Q3Y263D00KWC", // Brazil

    @Column(name = "marketplace_name")
    var marketplaceName: String = "Amazon.com.br",

    @Column(name = "refresh_token", nullable = false, columnDefinition = "TEXT")
    var refreshToken: String,

    @Column(name = "access_token", columnDefinition = "TEXT")
    var accessToken: String? = null,

    @Column(name = "token_expires_at")
    var tokenExpiresAt: Instant? = null,

    @Column(name = "lwa_client_id")
    var lwaClientId: String? = null,

    @Column(name = "lwa_client_secret", columnDefinition = "TEXT")
    var lwaClientSecret: String? = null,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: AmazonAccountStatus = AmazonAccountStatus.ACTIVE,

    @Column(columnDefinition = "TEXT")
    var description: String? = null,

    // Sync configuration
    @Column(name = "sync_products")
    var syncProducts: Boolean = true,

    @Column(name = "sync_inventory")
    var syncInventory: Boolean = true,

    @Column(name = "sync_prices")
    var syncPrices: Boolean = true,

    @Column(name = "sync_orders")
    var syncOrders: Boolean = false,

    @Column(name = "auto_sync_enabled")
    var autoSyncEnabled: Boolean = false,

    @Column(name = "sync_interval_minutes")
    var syncIntervalMinutes: Int = 60,

    // Default settings
    @Enumerated(EnumType.STRING)
    @Column(name = "default_fulfillment_channel")
    var defaultFulfillmentChannel: AmazonFulfillmentChannel = AmazonFulfillmentChannel.FBM,

    @Column(name = "default_condition")
    var defaultCondition: String = "new_new",

    @Column(name = "default_product_type")
    var defaultProductType: String? = null,

    // Stats
    @Column(name = "products_published")
    var productsPublished: Int = 0,

    @Column(name = "last_sync_at")
    var lastSyncAt: Instant? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "last_sync_status")
    var lastSyncStatus: AmazonSyncStatus? = null,

    @Column(name = "last_sync_message", columnDefinition = "TEXT")
    var lastSyncMessage: String? = null,

    // Seller info from Amazon API
    @Column(name = "seller_name")
    var sellerName: String? = null,

    @Column(name = "seller_rating")
    var sellerRating: Double? = null,

    // Audit
    @Column(name = "created_by")
    var createdBy: UUID? = null,

    @Column(name = "created_at", nullable = false)
    var createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()
) {
    fun isTokenExpired(): Boolean {
        return tokenExpiresAt?.isBefore(Instant.now()) ?: true
    }

    fun isActive(): Boolean = status == AmazonAccountStatus.ACTIVE
}

enum class AmazonAccountStatus {
    ACTIVE,
    INACTIVE,
    TOKEN_EXPIRED,
    SUSPENDED,
    ERROR
}

enum class AmazonFulfillmentChannel {
    FBA, // Fulfilled by Amazon
    FBM  // Fulfilled by Merchant
}

enum class AmazonSyncStatus {
    SUCCESS,
    PARTIAL,
    FAILED,
    IN_PROGRESS
}
