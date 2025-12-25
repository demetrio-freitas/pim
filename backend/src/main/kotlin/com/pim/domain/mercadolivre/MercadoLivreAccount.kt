package com.pim.domain.mercadolivre

import jakarta.persistence.*
import java.time.Instant
import java.util.*

@Entity
@Table(name = "mercadolivre_accounts")
data class MercadoLivreAccount(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(nullable = false)
    var name: String,

    @Column(name = "ml_user_id", nullable = false, unique = true)
    var mlUserId: String,

    @Column(name = "ml_nickname")
    var mlNickname: String? = null,

    @Column(name = "ml_email")
    var mlEmail: String? = null,

    @Column(name = "access_token", nullable = false, columnDefinition = "TEXT")
    var accessToken: String,

    @Column(name = "refresh_token", columnDefinition = "TEXT")
    var refreshToken: String? = null,

    @Column(name = "token_expires_at")
    var tokenExpiresAt: Instant? = null,

    @Column(name = "site_id")
    var siteId: String = "MLB", // MLB = Brasil, MLA = Argentina, etc.

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: MLAccountStatus = MLAccountStatus.ACTIVE,

    @Column(columnDefinition = "TEXT")
    var description: String? = null,

    // Sync configuration
    @Column(name = "sync_products")
    var syncProducts: Boolean = true,

    @Column(name = "sync_stock")
    var syncStock: Boolean = true,

    @Column(name = "sync_prices")
    var syncPrices: Boolean = true,

    @Column(name = "sync_orders")
    var syncOrders: Boolean = false,

    @Column(name = "auto_sync_enabled")
    var autoSyncEnabled: Boolean = false,

    @Column(name = "sync_interval_minutes")
    var syncIntervalMinutes: Int = 30,

    // Default settings
    @Column(name = "default_listing_type")
    @Enumerated(EnumType.STRING)
    var defaultListingType: MLListingType = MLListingType.GOLD_SPECIAL,

    @Column(name = "default_warranty")
    var defaultWarranty: String? = "12 meses de garantia do fabricante",

    @Column(name = "default_condition")
    var defaultCondition: String = "new",

    @Column(name = "default_shipping_mode")
    var defaultShippingMode: String = "me2", // me1, me2, custom

    @Column(name = "free_shipping_enabled")
    var freeShippingEnabled: Boolean = false,

    // Stats
    @Column(name = "products_published")
    var productsPublished: Int = 0,

    @Column(name = "last_sync_at")
    var lastSyncAt: Instant? = null,

    @Column(name = "last_sync_status")
    @Enumerated(EnumType.STRING)
    var lastSyncStatus: MLSyncStatus? = null,

    @Column(name = "last_sync_message", columnDefinition = "TEXT")
    var lastSyncMessage: String? = null,

    // Seller info from ML API
    @Column(name = "seller_reputation")
    var sellerReputation: String? = null,

    @Column(name = "seller_level")
    var sellerLevel: String? = null,

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

    fun isActive(): Boolean = status == MLAccountStatus.ACTIVE
}

enum class MLAccountStatus {
    ACTIVE,
    INACTIVE,
    TOKEN_EXPIRED,
    ERROR
}

enum class MLListingType {
    GOLD_SPECIAL,
    GOLD_PRO,
    GOLD,
    SILVER,
    BRONZE,
    FREE
}

enum class MLSyncStatus {
    SUCCESS,
    PARTIAL,
    FAILED,
    IN_PROGRESS
}
