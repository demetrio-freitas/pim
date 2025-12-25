package com.pim.domain.shopify

import jakarta.persistence.*
import java.time.Instant
import java.util.*

@Entity
@Table(name = "shopify_stores")
data class ShopifyStore(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(nullable = false, unique = true)
    var name: String,

    @Column(name = "shop_domain", nullable = false, unique = true)
    var shopDomain: String, // example.myshopify.com

    @Column(name = "access_token", nullable = false)
    var accessToken: String, // Shopify Admin API access token (encrypted)

    @Column(name = "api_version")
    var apiVersion: String = "2024-01", // Shopify API version

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: ShopifyStoreStatus = ShopifyStoreStatus.ACTIVE,

    @Column(columnDefinition = "TEXT")
    var description: String? = null,

    // Sync configuration
    @Column(name = "sync_products")
    var syncProducts: Boolean = true,

    @Column(name = "sync_inventory")
    var syncInventory: Boolean = true,

    @Column(name = "sync_prices")
    var syncPrices: Boolean = true,

    @Column(name = "sync_images")
    var syncImages: Boolean = true,

    @Column(name = "sync_direction")
    @Enumerated(EnumType.STRING)
    var syncDirection: SyncDirection = SyncDirection.PIM_TO_SHOPIFY,

    @Column(name = "auto_sync_enabled")
    var autoSyncEnabled: Boolean = false,

    @Column(name = "sync_interval_minutes")
    var syncIntervalMinutes: Int = 60,

    // Mapping configuration
    @Column(name = "default_product_type")
    var defaultProductType: String? = null,

    @Column(name = "default_vendor")
    var defaultVendor: String? = null,

    @Column(name = "default_collection_id")
    var defaultCollectionId: String? = null,

    // Shopify store info (cached from API)
    @Column(name = "shop_name")
    var shopName: String? = null,

    @Column(name = "shop_email")
    var shopEmail: String? = null,

    @Column(name = "shop_currency")
    var shopCurrency: String? = "BRL",

    @Column(name = "shop_timezone")
    var shopTimezone: String? = null,

    // Stats
    @Column(name = "products_synced")
    var productsSynced: Int = 0,

    @Column(name = "last_sync_at")
    var lastSyncAt: Instant? = null,

    @Column(name = "last_sync_status")
    @Enumerated(EnumType.STRING)
    var lastSyncStatus: SyncStatus? = null,

    @Column(name = "last_sync_message", columnDefinition = "TEXT")
    var lastSyncMessage: String? = null,

    // Webhook configuration
    @Column(name = "webhook_secret")
    var webhookSecret: String? = null,

    @Column(name = "webhooks_registered")
    var webhooksRegistered: Boolean = false,

    // Audit fields
    @Column(name = "created_by")
    var createdBy: UUID? = null,

    @Column(name = "created_at", nullable = false)
    var createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()
) {
    fun getApiUrl(): String = "https://${shopDomain}/admin/api/${apiVersion}"

    fun isActive(): Boolean = status == ShopifyStoreStatus.ACTIVE
}

enum class ShopifyStoreStatus {
    ACTIVE,
    INACTIVE,
    ERROR,
    PENDING_AUTH
}

enum class SyncDirection {
    PIM_TO_SHOPIFY,      // PIM is master, push to Shopify
    SHOPIFY_TO_PIM,      // Shopify is master, pull to PIM
    BIDIRECTIONAL        // Two-way sync with conflict resolution
}

enum class SyncStatus {
    SUCCESS,
    PARTIAL,
    FAILED,
    IN_PROGRESS
}
