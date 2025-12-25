package com.pim.application

import com.pim.domain.amazon.*
import com.pim.domain.product.Product
import com.pim.domain.product.AmazonFulfillmentChannel as ProductFulfillmentChannel
import com.pim.infrastructure.persistence.*
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.http.*
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.client.RestTemplate
import org.springframework.web.client.HttpClientErrorException
import java.time.Instant
import java.util.*

@Service
class AmazonService(
    private val accountRepository: AmazonAccountRepository,
    private val mappingRepository: AmazonProductMappingRepository,
    private val productRepository: ProductRepository
) {
    private val restTemplate = RestTemplate()

    // SP-API endpoints by region
    private val spApiEndpoints = mapOf(
        "NA" to "https://sellingpartnerapi-na.amazon.com",
        "EU" to "https://sellingpartnerapi-eu.amazon.com",
        "FE" to "https://sellingpartnerapi-fe.amazon.com"
    )

    // Marketplace to region mapping
    private val marketplaceRegions = mapOf(
        "A2Q3Y263D00KWC" to "NA", // Brazil
        "ATVPDKIKX0DER" to "NA",   // US
        "A2EUQ1WTGCTBG2" to "NA",  // Canada
        "A1AM78C64UM0Y8" to "NA",  // Mexico
        "A1PA6795UKMFR9" to "EU",  // Germany
        "A1RKKUPIHCS9HS" to "EU",  // Spain
        "A13V1IB3VIYBER" to "EU",  // France
        "A1F83G8C2ARO7P" to "EU",  // UK
        "A21TJRUUN4KGV" to "EU",   // India
        "A1VC38T7YXB528" to "FE",  // Japan
        "A39IBJ37TRP1C6" to "FE"   // Australia
    )

    // ==================== Account Management ====================

    @Transactional
    fun createAccount(request: AmazonAccountCreateRequest, userId: UUID?): AmazonAccountResponse {
        if (accountRepository.existsBySellerId(request.sellerId)) {
            throw IllegalArgumentException("Conta Amazon já existe com este Seller ID")
        }

        val account = AmazonAccount(
            name = request.name,
            sellerId = request.sellerId,
            marketplaceId = request.marketplaceId ?: "A2Q3Y263D00KWC",
            marketplaceName = request.marketplaceName ?: "Amazon.com.br",
            refreshToken = request.refreshToken,
            lwaClientId = request.lwaClientId,
            lwaClientSecret = request.lwaClientSecret,
            description = request.description,
            syncProducts = request.syncProducts ?: true,
            syncInventory = request.syncInventory ?: true,
            syncPrices = request.syncPrices ?: true,
            syncOrders = request.syncOrders ?: false,
            autoSyncEnabled = request.autoSyncEnabled ?: false,
            syncIntervalMinutes = request.syncIntervalMinutes ?: 60,
            defaultFulfillmentChannel = request.defaultFulfillmentChannel ?: AmazonFulfillmentChannel.FBM,
            defaultCondition = request.defaultCondition ?: "new_new",
            defaultProductType = request.defaultProductType,
            createdBy = userId
        )

        val saved = accountRepository.save(account)
        return saved.toResponse()
    }

    fun getAccountById(id: UUID): AmazonAccountResponse? {
        return accountRepository.findById(id).orElse(null)?.toResponse()
    }

    fun getAllAccounts(pageable: Pageable): Page<AmazonAccountResponse> {
        return accountRepository.findAll(pageable).map { it.toResponse() }
    }

    @Transactional
    fun updateAccount(id: UUID, request: AmazonAccountUpdateRequest): AmazonAccountResponse {
        val account = accountRepository.findById(id)
            .orElseThrow { IllegalArgumentException("Conta não encontrada") }

        request.name?.let { account.name = it }
        request.description?.let { account.description = it }
        request.syncProducts?.let { account.syncProducts = it }
        request.syncInventory?.let { account.syncInventory = it }
        request.syncPrices?.let { account.syncPrices = it }
        request.syncOrders?.let { account.syncOrders = it }
        request.autoSyncEnabled?.let { account.autoSyncEnabled = it }
        request.syncIntervalMinutes?.let { account.syncIntervalMinutes = it }
        request.defaultFulfillmentChannel?.let { account.defaultFulfillmentChannel = it }
        request.defaultCondition?.let { account.defaultCondition = it }
        request.defaultProductType?.let { account.defaultProductType = it }
        request.status?.let { account.status = it }

        account.updatedAt = Instant.now()
        val saved = accountRepository.save(account)
        return saved.toResponse()
    }

    @Transactional
    fun updateTokens(id: UUID, accessToken: String, expiresAt: Instant?) {
        val account = accountRepository.findById(id)
            .orElseThrow { IllegalArgumentException("Conta não encontrada") }

        account.accessToken = accessToken
        expiresAt?.let { account.tokenExpiresAt = it }
        account.status = AmazonAccountStatus.ACTIVE
        account.updatedAt = Instant.now()

        accountRepository.save(account)
    }

    @Transactional
    fun deleteAccount(id: UUID) {
        mappingRepository.deleteByAccountId(id)
        accountRepository.deleteById(id)
    }

    fun testConnection(id: UUID): Map<String, Any> {
        val account = accountRepository.findById(id)
            .orElseThrow { IllegalArgumentException("Conta não encontrada") }

        return try {
            // In production, you would:
            // 1. Use LWA (Login with Amazon) to get access token from refresh token
            // 2. Call SP-API to verify seller information

            // For now, we'll simulate a basic check
            if (account.refreshToken.isNotBlank()) {
                account.status = AmazonAccountStatus.ACTIVE
                account.updatedAt = Instant.now()
                accountRepository.save(account)

                mapOf(
                    "success" to true,
                    "message" to "Conexão estabelecida com sucesso",
                    "seller" to mapOf(
                        "sellerId" to account.sellerId,
                        "marketplaceId" to account.marketplaceId,
                        "marketplaceName" to account.marketplaceName
                    )
                )
            } else {
                mapOf("success" to false, "message" to "Refresh token não configurado")
            }
        } catch (e: HttpClientErrorException.Unauthorized) {
            account.status = AmazonAccountStatus.TOKEN_EXPIRED
            account.updatedAt = Instant.now()
            accountRepository.save(account)
            mapOf("success" to false, "message" to "Token expirado ou inválido", "error" to "unauthorized")
        } catch (e: Exception) {
            mapOf("success" to false, "message" to "Erro ao conectar: ${e.message}", "error" to e.javaClass.simpleName)
        }
    }

    // ==================== Product Sync ====================

    @Transactional
    fun syncProducts(
        accountId: UUID,
        request: AmazonSyncRequest,
        userId: UUID?
    ): AmazonSyncResultResponse {
        val account = accountRepository.findById(accountId)
            .orElseThrow { IllegalArgumentException("Conta não encontrada") }

        if (!account.isActive()) {
            throw IllegalStateException("Conta não está ativa")
        }

        val startTime = Instant.now()
        var created = 0
        var updated = 0
        var failed = 0
        val errors = mutableListOf<AmazonSyncError>()

        val productsToSync = if (request.productIds.isNullOrEmpty()) {
            productRepository.findAll()
        } else {
            productRepository.findAllById(request.productIds)
        }

        for (product in productsToSync) {
            try {
                val existingMapping = mappingRepository.findByAccountIdAndProductId(accountId, product.id)

                if (existingMapping != null) {
                    updateProductInAmazon(account, product, existingMapping)
                    updated++
                } else if (request.createNew != false) {
                    createProductInAmazon(account, product)
                    created++
                }
            } catch (e: Exception) {
                failed++
                errors.add(AmazonSyncError(
                    productId = product.id,
                    productSku = product.sku,
                    error = e.message ?: "Erro desconhecido"
                ))
            }
        }

        val syncStatus = when {
            failed == 0 -> AmazonSyncStatus.SUCCESS
            created + updated > 0 -> AmazonSyncStatus.PARTIAL
            else -> AmazonSyncStatus.FAILED
        }

        account.lastSyncAt = Instant.now()
        account.lastSyncStatus = syncStatus
        account.lastSyncMessage = "Criados: $created, Atualizados: $updated, Falhas: $failed"
        account.productsPublished = mappingRepository.countByAccountIdAndStatus(
            accountId, AmazonMappingStatus.ACTIVE
        ).toInt()
        accountRepository.save(account)

        return AmazonSyncResultResponse(
            success = failed == 0,
            created = created,
            updated = updated,
            failed = failed,
            errors = errors,
            syncStatus = syncStatus,
            duration = java.time.Duration.between(startTime, Instant.now()).toMillis()
        )
    }

    private fun createProductInAmazon(account: AmazonAccount, product: Product): AmazonProductMapping {
        // In production, this would submit a feed to Amazon SP-API
        // For now, we create the mapping with pending status

        val amazonSku = product.sku // Or generate a unique Amazon SKU

        val mapping = AmazonProductMapping(
            accountId = account.id,
            productId = product.id,
            amazonSku = amazonSku,
            amazonAsin = product.asin,
            amazonProductType = product.amazonProductType ?: account.defaultProductType,
            amazonBrowseNodeId = product.amazonBrowseNodeId,
            fulfillmentChannel = product.amazonFulfillmentChannel?.toAmazonType() ?: account.defaultFulfillmentChannel,
            status = AmazonMappingStatus.PENDING_SYNC,
            amazonPrice = product.price,
            amazonCurrency = "BRL",
            amazonQuantity = product.stockQuantity,
            lastSyncedAt = Instant.now(),
            lastSyncDirection = "pim_to_amazon"
        )

        return mappingRepository.save(mapping)
    }

    private fun updateProductInAmazon(
        account: AmazonAccount,
        product: Product,
        mapping: AmazonProductMapping
    ) {
        // In production, this would submit update feeds to Amazon SP-API

        mapping.amazonPrice = product.price
        mapping.amazonQuantity = product.stockQuantity
        mapping.fulfillmentChannel = product.amazonFulfillmentChannel?.toAmazonType() ?: account.defaultFulfillmentChannel
        mapping.lastSyncedAt = Instant.now()
        mapping.lastSyncDirection = "pim_to_amazon"
        mapping.syncError = null
        mapping.status = AmazonMappingStatus.ACTIVE
        mapping.updatedAt = Instant.now()

        mappingRepository.save(mapping)
    }

    // ==================== Product Mappings ====================

    fun getMappings(accountId: UUID, pageable: Pageable): Page<AmazonProductMappingResponse> {
        return mappingRepository.findByAccountId(accountId, pageable).map { it.toResponse() }
    }

    fun getMappingByProductId(accountId: UUID, productId: UUID): AmazonProductMappingResponse? {
        return mappingRepository.findByAccountIdAndProductId(accountId, productId)?.toResponse()
    }

    @Transactional
    fun unlinkProduct(accountId: UUID, productId: UUID) {
        val mapping = mappingRepository.findByAccountIdAndProductId(accountId, productId)
            ?: throw IllegalArgumentException("Mapeamento não encontrado")

        mapping.status = AmazonMappingStatus.DELETED_IN_PIM
        mapping.updatedAt = Instant.now()
        mappingRepository.save(mapping)
    }

    @Transactional
    fun deactivateProductInAmazon(accountId: UUID, productId: UUID) {
        val mapping = mappingRepository.findByAccountIdAndProductId(accountId, productId)
            ?: throw IllegalArgumentException("Mapeamento não encontrado")

        // In production, submit a feed to Amazon to set quantity to 0
        mapping.amazonQuantity = 0
        mapping.amazonStatus = "Inactive"
        mapping.status = AmazonMappingStatus.INACTIVE
        mapping.updatedAt = Instant.now()
        mappingRepository.save(mapping)
    }

    @Transactional
    fun reactivateProductInAmazon(accountId: UUID, productId: UUID) {
        val account = accountRepository.findById(accountId)
            .orElseThrow { IllegalArgumentException("Conta não encontrada") }
        val mapping = mappingRepository.findByAccountIdAndProductId(accountId, productId)
            ?: throw IllegalArgumentException("Mapeamento não encontrado")
        val product = productRepository.findById(productId)
            .orElseThrow { IllegalArgumentException("Produto não encontrado") }

        // In production, submit a feed to Amazon to update quantity
        mapping.amazonQuantity = product.stockQuantity
        mapping.amazonStatus = "Active"
        mapping.status = AmazonMappingStatus.ACTIVE
        mapping.updatedAt = Instant.now()
        mappingRepository.save(mapping)
    }

    fun getAccountStats(accountId: UUID): AmazonAccountStatsResponse {
        val totalProducts = mappingRepository.countByAccountId(accountId)
        val activeProducts = mappingRepository.countByAccountIdAndStatus(accountId, AmazonMappingStatus.ACTIVE)
        val withBuyBox = mappingRepository.countWithBuyBox(accountId)
        val suppressed = mappingRepository.findSuppressedByAccountId(accountId).size
        val fba = mappingRepository.findByAccountIdAndFulfillmentChannel(accountId, AmazonFulfillmentChannel.FBA).size
        val fbm = mappingRepository.findByAccountIdAndFulfillmentChannel(accountId, AmazonFulfillmentChannel.FBM).size

        return AmazonAccountStatsResponse(
            totalProducts = totalProducts.toInt(),
            activeProducts = activeProducts.toInt(),
            withBuyBox = withBuyBox.toInt(),
            suppressedProducts = suppressed,
            fbaProducts = fba,
            fbmProducts = fbm
        )
    }

    // ==================== Marketplaces ====================

    fun getMarketplaces(): List<AmazonMarketplaceResponse> {
        return listOf(
            AmazonMarketplaceResponse("A2Q3Y263D00KWC", "Amazon.com.br", "Brazil", "BRL", "NA"),
            AmazonMarketplaceResponse("ATVPDKIKX0DER", "Amazon.com", "United States", "USD", "NA"),
            AmazonMarketplaceResponse("A2EUQ1WTGCTBG2", "Amazon.ca", "Canada", "CAD", "NA"),
            AmazonMarketplaceResponse("A1AM78C64UM0Y8", "Amazon.com.mx", "Mexico", "MXN", "NA"),
            AmazonMarketplaceResponse("A1PA6795UKMFR9", "Amazon.de", "Germany", "EUR", "EU"),
            AmazonMarketplaceResponse("A1RKKUPIHCS9HS", "Amazon.es", "Spain", "EUR", "EU"),
            AmazonMarketplaceResponse("A13V1IB3VIYBER", "Amazon.fr", "France", "EUR", "EU"),
            AmazonMarketplaceResponse("A1F83G8C2ARO7P", "Amazon.co.uk", "United Kingdom", "GBP", "EU"),
            AmazonMarketplaceResponse("APJ6JRA9NG5V4", "Amazon.it", "Italy", "EUR", "EU"),
            AmazonMarketplaceResponse("A21TJRUUN4KGV", "Amazon.in", "India", "INR", "EU"),
            AmazonMarketplaceResponse("A1VC38T7YXB528", "Amazon.co.jp", "Japan", "JPY", "FE"),
            AmazonMarketplaceResponse("A39IBJ37TRP1C6", "Amazon.com.au", "Australia", "AUD", "FE")
        )
    }
}

// ==================== Extension Functions ====================

private fun ProductFulfillmentChannel.toAmazonType(): AmazonFulfillmentChannel = when (this) {
    ProductFulfillmentChannel.FBA -> AmazonFulfillmentChannel.FBA
    ProductFulfillmentChannel.FBM -> AmazonFulfillmentChannel.FBM
}

private fun AmazonAccount.toResponse() = AmazonAccountResponse(
    id = id,
    name = name,
    sellerId = sellerId,
    marketplaceId = marketplaceId,
    marketplaceName = marketplaceName,
    status = status,
    description = description,
    syncProducts = syncProducts,
    syncInventory = syncInventory,
    syncPrices = syncPrices,
    syncOrders = syncOrders,
    autoSyncEnabled = autoSyncEnabled,
    syncIntervalMinutes = syncIntervalMinutes,
    defaultFulfillmentChannel = defaultFulfillmentChannel,
    defaultCondition = defaultCondition,
    defaultProductType = defaultProductType,
    productsPublished = productsPublished,
    lastSyncAt = lastSyncAt,
    lastSyncStatus = lastSyncStatus,
    lastSyncMessage = lastSyncMessage,
    sellerName = sellerName,
    sellerRating = sellerRating,
    createdAt = createdAt,
    updatedAt = updatedAt
)

private fun AmazonProductMapping.toResponse() = AmazonProductMappingResponse(
    id = id,
    accountId = accountId,
    productId = productId,
    amazonAsin = amazonAsin,
    amazonSku = amazonSku,
    amazonFnsku = amazonFnsku,
    amazonListingId = amazonListingId,
    amazonProductType = amazonProductType,
    amazonBrowseNodeId = amazonBrowseNodeId,
    fulfillmentChannel = fulfillmentChannel,
    status = status,
    amazonStatus = amazonStatus,
    hasBuyBox = hasBuyBox,
    buyBoxPrice = buyBoxPrice,
    amazonPrice = amazonPrice,
    amazonSalePrice = amazonSalePrice,
    amazonCurrency = amazonCurrency,
    amazonQuantity = amazonQuantity,
    fbaQuantity = fbaQuantity,
    reservedQuantity = reservedQuantity,
    referralFee = referralFee,
    fbaFee = fbaFee,
    listingQualityScore = listingQualityScore,
    listingIssues = listingIssues,
    suppressedReason = suppressedReason,
    lastSyncedAt = lastSyncedAt,
    lastSyncDirection = lastSyncDirection,
    syncError = syncError,
    lastFeedId = lastFeedId,
    lastFeedStatus = lastFeedStatus,
    createdAt = createdAt,
    updatedAt = updatedAt
)

// ==================== DTOs ====================

data class AmazonAccountCreateRequest(
    val name: String,
    val sellerId: String,
    val marketplaceId: String? = null,
    val marketplaceName: String? = null,
    val refreshToken: String,
    val lwaClientId: String? = null,
    val lwaClientSecret: String? = null,
    val description: String? = null,
    val syncProducts: Boolean? = null,
    val syncInventory: Boolean? = null,
    val syncPrices: Boolean? = null,
    val syncOrders: Boolean? = null,
    val autoSyncEnabled: Boolean? = null,
    val syncIntervalMinutes: Int? = null,
    val defaultFulfillmentChannel: AmazonFulfillmentChannel? = null,
    val defaultCondition: String? = null,
    val defaultProductType: String? = null
)

data class AmazonAccountUpdateRequest(
    val name: String? = null,
    val description: String? = null,
    val syncProducts: Boolean? = null,
    val syncInventory: Boolean? = null,
    val syncPrices: Boolean? = null,
    val syncOrders: Boolean? = null,
    val autoSyncEnabled: Boolean? = null,
    val syncIntervalMinutes: Int? = null,
    val defaultFulfillmentChannel: AmazonFulfillmentChannel? = null,
    val defaultCondition: String? = null,
    val defaultProductType: String? = null,
    val status: AmazonAccountStatus? = null
)

data class AmazonAccountResponse(
    val id: UUID,
    val name: String,
    val sellerId: String,
    val marketplaceId: String,
    val marketplaceName: String,
    val status: AmazonAccountStatus,
    val description: String?,
    val syncProducts: Boolean,
    val syncInventory: Boolean,
    val syncPrices: Boolean,
    val syncOrders: Boolean,
    val autoSyncEnabled: Boolean,
    val syncIntervalMinutes: Int,
    val defaultFulfillmentChannel: AmazonFulfillmentChannel,
    val defaultCondition: String,
    val defaultProductType: String?,
    val productsPublished: Int,
    val lastSyncAt: Instant?,
    val lastSyncStatus: AmazonSyncStatus?,
    val lastSyncMessage: String?,
    val sellerName: String?,
    val sellerRating: Double?,
    val createdAt: Instant,
    val updatedAt: Instant
)

data class AmazonAccountStatsResponse(
    val totalProducts: Int,
    val activeProducts: Int,
    val withBuyBox: Int,
    val suppressedProducts: Int,
    val fbaProducts: Int,
    val fbmProducts: Int
)

data class AmazonSyncRequest(
    val productIds: List<UUID>? = null,
    val createNew: Boolean? = true
)

data class AmazonSyncResultResponse(
    val success: Boolean,
    val created: Int,
    val updated: Int,
    val failed: Int,
    val errors: List<AmazonSyncError>,
    val syncStatus: AmazonSyncStatus,
    val duration: Long
)

data class AmazonSyncError(
    val productId: UUID,
    val productSku: String,
    val error: String
)

data class AmazonProductMappingResponse(
    val id: UUID,
    val accountId: UUID,
    val productId: UUID,
    val amazonAsin: String?,
    val amazonSku: String,
    val amazonFnsku: String?,
    val amazonListingId: String?,
    val amazonProductType: String?,
    val amazonBrowseNodeId: String?,
    val fulfillmentChannel: AmazonFulfillmentChannel,
    val status: AmazonMappingStatus,
    val amazonStatus: String?,
    val hasBuyBox: Boolean,
    val buyBoxPrice: java.math.BigDecimal?,
    val amazonPrice: java.math.BigDecimal?,
    val amazonSalePrice: java.math.BigDecimal?,
    val amazonCurrency: String,
    val amazonQuantity: Int,
    val fbaQuantity: Int,
    val reservedQuantity: Int,
    val referralFee: java.math.BigDecimal?,
    val fbaFee: java.math.BigDecimal?,
    val listingQualityScore: Int?,
    val listingIssues: String?,
    val suppressedReason: String?,
    val lastSyncedAt: Instant?,
    val lastSyncDirection: String?,
    val syncError: String?,
    val lastFeedId: String?,
    val lastFeedStatus: String?,
    val createdAt: Instant,
    val updatedAt: Instant
)

data class AmazonMarketplaceResponse(
    val id: String,
    val name: String,
    val country: String,
    val currency: String,
    val region: String
)
