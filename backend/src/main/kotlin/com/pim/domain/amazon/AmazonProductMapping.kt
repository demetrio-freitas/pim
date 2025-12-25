package com.pim.domain.amazon

import jakarta.persistence.*
import java.time.Instant
import java.util.*

@Entity
@Table(
    name = "amazon_product_mappings",
    uniqueConstraints = [
        UniqueConstraint(columnNames = ["account_id", "product_id"]),
        UniqueConstraint(columnNames = ["account_id", "amazon_asin"])
    ]
)
data class AmazonProductMapping(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(name = "account_id", nullable = false)
    val accountId: UUID,

    @Column(name = "product_id", nullable = false)
    val productId: UUID,

    @Column(name = "amazon_asin")
    var amazonAsin: String? = null,

    @Column(name = "amazon_sku", nullable = false)
    var amazonSku: String,

    @Column(name = "amazon_fnsku")
    var amazonFnsku: String? = null, // FBA SKU

    @Column(name = "amazon_listing_id")
    var amazonListingId: String? = null,

    @Column(name = "amazon_product_type")
    var amazonProductType: String? = null,

    @Column(name = "amazon_browse_node_id")
    var amazonBrowseNodeId: String? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "fulfillment_channel")
    var fulfillmentChannel: AmazonFulfillmentChannel = AmazonFulfillmentChannel.FBM,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: AmazonMappingStatus = AmazonMappingStatus.ACTIVE,

    @Column(name = "amazon_status")
    var amazonStatus: String? = null, // Active, Inactive, Incomplete, etc.

    // Buy Box
    @Column(name = "has_buy_box")
    var hasBuyBox: Boolean = false,

    @Column(name = "buy_box_price")
    var buyBoxPrice: java.math.BigDecimal? = null,

    // Pricing info from Amazon
    @Column(name = "amazon_price")
    var amazonPrice: java.math.BigDecimal? = null,

    @Column(name = "amazon_sale_price")
    var amazonSalePrice: java.math.BigDecimal? = null,

    @Column(name = "amazon_currency")
    var amazonCurrency: String = "BRL",

    // Inventory
    @Column(name = "amazon_quantity")
    var amazonQuantity: Int = 0,

    @Column(name = "fba_quantity")
    var fbaQuantity: Int = 0,

    @Column(name = "reserved_quantity")
    var reservedQuantity: Int = 0,

    // Fees
    @Column(name = "referral_fee")
    var referralFee: java.math.BigDecimal? = null,

    @Column(name = "fba_fee")
    var fbaFee: java.math.BigDecimal? = null,

    // Health/Listing Quality
    @Column(name = "listing_quality_score")
    var listingQualityScore: Int? = null,

    @Column(name = "listing_issues", columnDefinition = "TEXT")
    var listingIssues: String? = null, // JSON array of issues

    @Column(name = "suppressed_reason")
    var suppressedReason: String? = null,

    // Sync info
    @Column(name = "last_synced_at")
    var lastSyncedAt: Instant? = null,

    @Column(name = "last_sync_direction")
    var lastSyncDirection: String? = null, // pim_to_amazon, amazon_to_pim

    @Column(name = "sync_error", columnDefinition = "TEXT")
    var syncError: String? = null,

    // Feed submission tracking
    @Column(name = "last_feed_id")
    var lastFeedId: String? = null,

    @Column(name = "last_feed_status")
    var lastFeedStatus: String? = null,

    // Audit
    @Column(name = "created_at", nullable = false)
    var createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()
)

enum class AmazonMappingStatus {
    ACTIVE,
    PENDING_SYNC,
    SYNC_ERROR,
    INACTIVE,
    SUPPRESSED,
    INCOMPLETE,
    DELETED_IN_AMAZON,
    DELETED_IN_PIM
}
