package com.pim.application

import com.pim.domain.mercadolivre.*
import com.pim.domain.product.Product
import com.pim.domain.product.MLListingType as ProductMLListingType
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
class MercadoLivreService(
    private val accountRepository: MercadoLivreAccountRepository,
    private val mappingRepository: MLProductMappingRepository,
    private val productRepository: ProductRepository
) {
    private val restTemplate = RestTemplate()
    private val mlApiBaseUrl = "https://api.mercadolibre.com"

    // ==================== Account Management ====================

    @Transactional
    fun createAccount(request: MLAccountCreateRequest, userId: UUID?): MLAccountResponse {
        if (accountRepository.existsByMlUserId(request.mlUserId)) {
            throw IllegalArgumentException("Conta do Mercado Livre já existe com este ID")
        }

        val account = MercadoLivreAccount(
            name = request.name,
            mlUserId = request.mlUserId,
            mlNickname = request.mlNickname,
            mlEmail = request.mlEmail,
            accessToken = request.accessToken,
            refreshToken = request.refreshToken,
            tokenExpiresAt = request.tokenExpiresAt,
            siteId = request.siteId ?: "MLB",
            description = request.description,
            syncProducts = request.syncProducts ?: true,
            syncStock = request.syncStock ?: true,
            syncPrices = request.syncPrices ?: true,
            syncOrders = request.syncOrders ?: false,
            autoSyncEnabled = request.autoSyncEnabled ?: false,
            syncIntervalMinutes = request.syncIntervalMinutes ?: 30,
            defaultListingType = request.defaultListingType ?: MLListingType.GOLD_SPECIAL,
            defaultWarranty = request.defaultWarranty ?: "12 meses de garantia do fabricante",
            defaultCondition = request.defaultCondition ?: "new",
            defaultShippingMode = request.defaultShippingMode ?: "me2",
            freeShippingEnabled = request.freeShippingEnabled ?: false,
            createdBy = userId
        )

        val saved = accountRepository.save(account)
        return saved.toResponse()
    }

    fun getAccountById(id: UUID): MLAccountResponse? {
        return accountRepository.findById(id).orElse(null)?.toResponse()
    }

    fun getAllAccounts(pageable: Pageable): Page<MLAccountResponse> {
        return accountRepository.findAll(pageable).map { it.toResponse() }
    }

    @Transactional
    fun updateAccount(id: UUID, request: MLAccountUpdateRequest): MLAccountResponse {
        val account = accountRepository.findById(id)
            .orElseThrow { IllegalArgumentException("Conta não encontrada") }

        request.name?.let { account.name = it }
        request.description?.let { account.description = it }
        request.syncProducts?.let { account.syncProducts = it }
        request.syncStock?.let { account.syncStock = it }
        request.syncPrices?.let { account.syncPrices = it }
        request.syncOrders?.let { account.syncOrders = it }
        request.autoSyncEnabled?.let { account.autoSyncEnabled = it }
        request.syncIntervalMinutes?.let { account.syncIntervalMinutes = it }
        request.defaultListingType?.let { account.defaultListingType = it }
        request.defaultWarranty?.let { account.defaultWarranty = it }
        request.defaultCondition?.let { account.defaultCondition = it }
        request.defaultShippingMode?.let { account.defaultShippingMode = it }
        request.freeShippingEnabled?.let { account.freeShippingEnabled = it }
        request.status?.let { account.status = it }

        account.updatedAt = Instant.now()
        val saved = accountRepository.save(account)
        return saved.toResponse()
    }

    @Transactional
    fun updateTokens(id: UUID, accessToken: String, refreshToken: String?, expiresAt: Instant?) {
        val account = accountRepository.findById(id)
            .orElseThrow { IllegalArgumentException("Conta não encontrada") }

        account.accessToken = accessToken
        refreshToken?.let { account.refreshToken = it }
        expiresAt?.let { account.tokenExpiresAt = it }
        account.status = MLAccountStatus.ACTIVE
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
            val headers = HttpHeaders().apply {
                setBearerAuth(account.accessToken)
            }
            val entity = HttpEntity<String>(headers)

            val response = restTemplate.exchange(
                "$mlApiBaseUrl/users/me",
                HttpMethod.GET,
                entity,
                Map::class.java
            )

            if (response.statusCode.is2xxSuccessful && response.body != null) {
                val userData = response.body as Map<*, *>

                account.mlNickname = userData["nickname"] as? String
                account.mlEmail = userData["email"] as? String
                account.sellerLevel = (userData["seller_reputation"] as? Map<*, *>)?.get("level_id") as? String
                account.status = MLAccountStatus.ACTIVE
                account.updatedAt = Instant.now()
                accountRepository.save(account)

                mapOf(
                    "success" to true,
                    "message" to "Conexão estabelecida com sucesso",
                    "user" to mapOf(
                        "id" to userData["id"],
                        "nickname" to userData["nickname"],
                        "email" to userData["email"]
                    )
                )
            } else {
                mapOf("success" to false, "message" to "Falha ao conectar com Mercado Livre")
            }
        } catch (e: HttpClientErrorException.Unauthorized) {
            account.status = MLAccountStatus.TOKEN_EXPIRED
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
        request: MLSyncRequest,
        userId: UUID?
    ): MLSyncResultResponse {
        val account = accountRepository.findById(accountId)
            .orElseThrow { IllegalArgumentException("Conta não encontrada") }

        if (!account.isActive()) {
            throw IllegalStateException("Conta não está ativa")
        }

        val startTime = Instant.now()
        var created = 0
        var updated = 0
        var failed = 0
        val errors = mutableListOf<MLSyncError>()

        val productsToSync = if (request.productIds.isNullOrEmpty()) {
            productRepository.findAll()
        } else {
            productRepository.findAllById(request.productIds)
        }

        for (product in productsToSync) {
            try {
                val existingMapping = mappingRepository.findByAccountIdAndProductId(accountId, product.id)

                if (existingMapping != null) {
                    updateProductInML(account, product, existingMapping)
                    updated++
                } else if (request.createNew != false) {
                    createProductInML(account, product)
                    created++
                }
            } catch (e: Exception) {
                failed++
                errors.add(MLSyncError(
                    productId = product.id,
                    productSku = product.sku,
                    error = e.message ?: "Erro desconhecido"
                ))
            }
        }

        val syncStatus = when {
            failed == 0 -> MLSyncStatus.SUCCESS
            created + updated > 0 -> MLSyncStatus.PARTIAL
            else -> MLSyncStatus.FAILED
        }

        account.lastSyncAt = Instant.now()
        account.lastSyncStatus = syncStatus
        account.lastSyncMessage = "Criados: $created, Atualizados: $updated, Falhas: $failed"
        account.productsPublished = mappingRepository.countByAccountIdAndStatus(
            accountId, MLMappingStatus.ACTIVE
        ).toInt()
        accountRepository.save(account)

        return MLSyncResultResponse(
            success = failed == 0,
            created = created,
            updated = updated,
            failed = failed,
            errors = errors,
            syncStatus = syncStatus,
            duration = java.time.Duration.between(startTime, Instant.now()).toMillis()
        )
    }

    private fun createProductInML(account: MercadoLivreAccount, product: Product): MLProductMapping {
        val mlPayload = buildMLProductPayload(account, product)

        val headers = HttpHeaders().apply {
            contentType = MediaType.APPLICATION_JSON
            setBearerAuth(account.accessToken)
        }

        val entity = HttpEntity(mlPayload, headers)

        val response = restTemplate.exchange(
            "$mlApiBaseUrl/items",
            HttpMethod.POST,
            entity,
            Map::class.java
        )

        val responseBody = response.body as Map<*, *>
        val mlItemId = responseBody["id"] as String

        val mapping = MLProductMapping(
            accountId = account.id,
            productId = product.id,
            mlItemId = mlItemId,
            mlPermalink = responseBody["permalink"] as? String,
            mlCategoryId = responseBody["category_id"] as? String,
            listingType = product.mlListingType?.toMercadoLivreType() ?: account.defaultListingType,
            status = MLMappingStatus.ACTIVE,
            mlStatus = responseBody["status"] as? String,
            mlPrice = product.price,
            mlCurrency = "BRL",
            mlAvailableQuantity = product.stockQuantity,
            freeShipping = product.mlFreeShipping || account.freeShippingEnabled,
            lastSyncedAt = Instant.now(),
            lastSyncDirection = "pim_to_ml"
        )

        return mappingRepository.save(mapping)
    }

    private fun updateProductInML(
        account: MercadoLivreAccount,
        product: Product,
        mapping: MLProductMapping
    ) {
        val mlPayload = buildMLUpdatePayload(account, product)

        val headers = HttpHeaders().apply {
            contentType = MediaType.APPLICATION_JSON
            setBearerAuth(account.accessToken)
        }

        val entity = HttpEntity(mlPayload, headers)

        restTemplate.exchange(
            "$mlApiBaseUrl/items/${mapping.mlItemId}",
            HttpMethod.PUT,
            entity,
            Map::class.java
        )

        mapping.mlPrice = product.price
        mapping.mlAvailableQuantity = product.stockQuantity
        mapping.freeShipping = product.mlFreeShipping || account.freeShippingEnabled
        mapping.lastSyncedAt = Instant.now()
        mapping.lastSyncDirection = "pim_to_ml"
        mapping.syncError = null
        mapping.status = MLMappingStatus.ACTIVE
        mapping.updatedAt = Instant.now()

        mappingRepository.save(mapping)
    }

    private fun buildMLProductPayload(account: MercadoLivreAccount, product: Product): Map<String, Any?> {
        return mapOf(
            "title" to product.name,
            "category_id" to (product.mlCategoryId ?: "MLB1000"), // TODO: Category mapping
            "price" to product.price,
            "currency_id" to "BRL",
            "available_quantity" to product.stockQuantity,
            "buying_mode" to "buy_it_now",
            "condition" to (product.productCondition?.name?.lowercase() ?: account.defaultCondition),
            "listing_type_id" to (product.mlListingType?.toMLCode() ?: account.defaultListingType.toMLCode()),
            "description" to mapOf("plain_text" to product.description),
            "warranty" to (product.warranty ?: account.defaultWarranty),
            "shipping" to mapOf(
                "mode" to (product.mlShippingMode ?: account.defaultShippingMode),
                "free_shipping" to (product.mlFreeShipping || account.freeShippingEnabled),
                "dimensions" to if (product.length != null && product.width != null && product.height != null) {
                    "${product.length}x${product.width}x${product.height},${product.weight ?: 0}"
                } else null
            ),
            "attributes" to buildMLAttributes(product)
        )
    }

    private fun buildMLUpdatePayload(account: MercadoLivreAccount, product: Product): Map<String, Any?> {
        return mapOf(
            "title" to product.name,
            "price" to product.price,
            "available_quantity" to product.stockQuantity,
            "shipping" to mapOf(
                "free_shipping" to (product.mlFreeShipping || account.freeShippingEnabled)
            )
        )
    }

    private fun buildMLAttributes(product: Product): List<Map<String, Any?>> {
        val attributes = mutableListOf<Map<String, Any?>>()

        product.brand?.let {
            attributes.add(mapOf("id" to "BRAND", "value_name" to it))
        }
        product.gtin?.let {
            attributes.add(mapOf("id" to "GTIN", "value_name" to it))
        }
        product.mpn?.let {
            attributes.add(mapOf("id" to "MPN", "value_name" to it))
        }
        product.color?.let {
            attributes.add(mapOf("id" to "COLOR", "value_name" to it))
        }
        product.size?.let {
            attributes.add(mapOf("id" to "SIZE", "value_name" to it))
        }
        product.material?.let {
            attributes.add(mapOf("id" to "MATERIAL", "value_name" to it))
        }

        return attributes
    }

    // ==================== Product Mappings ====================

    fun getMappings(accountId: UUID, pageable: Pageable): Page<MLProductMappingResponse> {
        return mappingRepository.findByAccountId(accountId, pageable).map { it.toResponse() }
    }

    fun getMappingByProductId(accountId: UUID, productId: UUID): MLProductMappingResponse? {
        return mappingRepository.findByAccountIdAndProductId(accountId, productId)?.toResponse()
    }

    @Transactional
    fun unlinkProduct(accountId: UUID, productId: UUID) {
        val mapping = mappingRepository.findByAccountIdAndProductId(accountId, productId)
            ?: throw IllegalArgumentException("Mapeamento não encontrado")

        mapping.status = MLMappingStatus.DELETED_IN_PIM
        mapping.updatedAt = Instant.now()
        mappingRepository.save(mapping)
    }

    @Transactional
    fun pauseProductInML(accountId: UUID, productId: UUID) {
        val account = accountRepository.findById(accountId)
            .orElseThrow { IllegalArgumentException("Conta não encontrada") }
        val mapping = mappingRepository.findByAccountIdAndProductId(accountId, productId)
            ?: throw IllegalArgumentException("Mapeamento não encontrado")

        val headers = HttpHeaders().apply {
            contentType = MediaType.APPLICATION_JSON
            setBearerAuth(account.accessToken)
        }

        val payload = mapOf("status" to "paused")
        val entity = HttpEntity(payload, headers)

        restTemplate.exchange(
            "$mlApiBaseUrl/items/${mapping.mlItemId}",
            HttpMethod.PUT,
            entity,
            Map::class.java
        )

        mapping.mlStatus = "paused"
        mapping.status = MLMappingStatus.PAUSED
        mapping.updatedAt = Instant.now()
        mappingRepository.save(mapping)
    }

    @Transactional
    fun reactivateProductInML(accountId: UUID, productId: UUID) {
        val account = accountRepository.findById(accountId)
            .orElseThrow { IllegalArgumentException("Conta não encontrada") }
        val mapping = mappingRepository.findByAccountIdAndProductId(accountId, productId)
            ?: throw IllegalArgumentException("Mapeamento não encontrado")

        val headers = HttpHeaders().apply {
            contentType = MediaType.APPLICATION_JSON
            setBearerAuth(account.accessToken)
        }

        val payload = mapOf("status" to "active")
        val entity = HttpEntity(payload, headers)

        restTemplate.exchange(
            "$mlApiBaseUrl/items/${mapping.mlItemId}",
            HttpMethod.PUT,
            entity,
            Map::class.java
        )

        mapping.mlStatus = "active"
        mapping.status = MLMappingStatus.ACTIVE
        mapping.updatedAt = Instant.now()
        mappingRepository.save(mapping)
    }

    // ==================== Categories ====================

    fun getCategories(siteId: String = "MLB"): List<MLCategoryResponse> {
        val response = restTemplate.getForEntity(
            "$mlApiBaseUrl/sites/$siteId/categories",
            List::class.java
        )

        return (response.body as? List<*>)?.mapNotNull { cat ->
            val catMap = cat as? Map<*, *>
            catMap?.let {
                MLCategoryResponse(
                    id = it["id"] as? String ?: "",
                    name = it["name"] as? String ?: ""
                )
            }
        } ?: emptyList()
    }

    fun getCategoryAttributes(categoryId: String): List<MLAttributeResponse> {
        val response = restTemplate.getForEntity(
            "$mlApiBaseUrl/categories/$categoryId/attributes",
            List::class.java
        )

        return (response.body as? List<*>)?.mapNotNull { attr ->
            val attrMap = attr as? Map<*, *>
            attrMap?.let {
                MLAttributeResponse(
                    id = it["id"] as? String ?: "",
                    name = it["name"] as? String ?: "",
                    required = (it["tags"] as? Map<*, *>)?.get("required") == true,
                    values = (it["values"] as? List<*>)?.mapNotNull { v ->
                        val vMap = v as? Map<*, *>
                        vMap?.let { vm ->
                            MLAttributeValue(
                                id = vm["id"] as? String ?: "",
                                name = vm["name"] as? String ?: ""
                            )
                        }
                    } ?: emptyList()
                )
            }
        } ?: emptyList()
    }
}

// ==================== Extension Functions ====================

private fun MLListingType.toMLCode(): String = when (this) {
    MLListingType.GOLD_SPECIAL -> "gold_special"
    MLListingType.GOLD_PRO -> "gold_pro"
    MLListingType.GOLD -> "gold"
    MLListingType.SILVER -> "silver"
    MLListingType.BRONZE -> "bronze"
    MLListingType.FREE -> "free"
}

private fun ProductMLListingType.toMLCode(): String = when (this) {
    ProductMLListingType.GOLD_SPECIAL -> "gold_special"
    ProductMLListingType.GOLD_PRO -> "gold_pro"
    ProductMLListingType.GOLD -> "gold"
    ProductMLListingType.SILVER -> "silver"
    ProductMLListingType.BRONZE -> "bronze"
    ProductMLListingType.FREE -> "free"
}

private fun ProductMLListingType.toMercadoLivreType(): MLListingType = when (this) {
    ProductMLListingType.GOLD_SPECIAL -> MLListingType.GOLD_SPECIAL
    ProductMLListingType.GOLD_PRO -> MLListingType.GOLD_PRO
    ProductMLListingType.GOLD -> MLListingType.GOLD
    ProductMLListingType.SILVER -> MLListingType.SILVER
    ProductMLListingType.BRONZE -> MLListingType.BRONZE
    ProductMLListingType.FREE -> MLListingType.FREE
}

private fun MercadoLivreAccount.toResponse() = MLAccountResponse(
    id = id,
    name = name,
    mlUserId = mlUserId,
    mlNickname = mlNickname,
    mlEmail = mlEmail,
    siteId = siteId,
    status = status,
    description = description,
    syncProducts = syncProducts,
    syncStock = syncStock,
    syncPrices = syncPrices,
    syncOrders = syncOrders,
    autoSyncEnabled = autoSyncEnabled,
    syncIntervalMinutes = syncIntervalMinutes,
    defaultListingType = defaultListingType,
    defaultWarranty = defaultWarranty,
    defaultCondition = defaultCondition,
    defaultShippingMode = defaultShippingMode,
    freeShippingEnabled = freeShippingEnabled,
    productsPublished = productsPublished,
    lastSyncAt = lastSyncAt,
    lastSyncStatus = lastSyncStatus,
    lastSyncMessage = lastSyncMessage,
    sellerLevel = sellerLevel,
    createdAt = createdAt,
    updatedAt = updatedAt
)

private fun MLProductMapping.toResponse() = MLProductMappingResponse(
    id = id,
    accountId = accountId,
    productId = productId,
    mlItemId = mlItemId,
    mlPermalink = mlPermalink,
    mlCategoryId = mlCategoryId,
    mlCategoryName = mlCategoryName,
    listingType = listingType,
    status = status,
    mlStatus = mlStatus,
    mlPrice = mlPrice,
    mlOriginalPrice = mlOriginalPrice,
    mlCurrency = mlCurrency,
    mlAvailableQuantity = mlAvailableQuantity,
    mlSoldQuantity = mlSoldQuantity,
    freeShipping = freeShipping,
    shippingMode = shippingMode,
    healthScore = healthScore,
    healthIssues = healthIssues,
    lastSyncedAt = lastSyncedAt,
    lastSyncDirection = lastSyncDirection,
    syncError = syncError,
    createdAt = createdAt,
    updatedAt = updatedAt
)

// ==================== DTOs ====================

data class MLAccountCreateRequest(
    val name: String,
    val mlUserId: String,
    val mlNickname: String? = null,
    val mlEmail: String? = null,
    val accessToken: String,
    val refreshToken: String? = null,
    val tokenExpiresAt: Instant? = null,
    val siteId: String? = null,
    val description: String? = null,
    val syncProducts: Boolean? = null,
    val syncStock: Boolean? = null,
    val syncPrices: Boolean? = null,
    val syncOrders: Boolean? = null,
    val autoSyncEnabled: Boolean? = null,
    val syncIntervalMinutes: Int? = null,
    val defaultListingType: MLListingType? = null,
    val defaultWarranty: String? = null,
    val defaultCondition: String? = null,
    val defaultShippingMode: String? = null,
    val freeShippingEnabled: Boolean? = null
)

data class MLAccountUpdateRequest(
    val name: String? = null,
    val description: String? = null,
    val syncProducts: Boolean? = null,
    val syncStock: Boolean? = null,
    val syncPrices: Boolean? = null,
    val syncOrders: Boolean? = null,
    val autoSyncEnabled: Boolean? = null,
    val syncIntervalMinutes: Int? = null,
    val defaultListingType: MLListingType? = null,
    val defaultWarranty: String? = null,
    val defaultCondition: String? = null,
    val defaultShippingMode: String? = null,
    val freeShippingEnabled: Boolean? = null,
    val status: MLAccountStatus? = null
)

data class MLAccountResponse(
    val id: UUID,
    val name: String,
    val mlUserId: String,
    val mlNickname: String?,
    val mlEmail: String?,
    val siteId: String,
    val status: MLAccountStatus,
    val description: String?,
    val syncProducts: Boolean,
    val syncStock: Boolean,
    val syncPrices: Boolean,
    val syncOrders: Boolean,
    val autoSyncEnabled: Boolean,
    val syncIntervalMinutes: Int,
    val defaultListingType: MLListingType,
    val defaultWarranty: String?,
    val defaultCondition: String,
    val defaultShippingMode: String,
    val freeShippingEnabled: Boolean,
    val productsPublished: Int,
    val lastSyncAt: Instant?,
    val lastSyncStatus: MLSyncStatus?,
    val lastSyncMessage: String?,
    val sellerLevel: String?,
    val createdAt: Instant,
    val updatedAt: Instant
)

data class MLSyncRequest(
    val productIds: List<UUID>? = null,
    val createNew: Boolean? = true
)

data class MLSyncResultResponse(
    val success: Boolean,
    val created: Int,
    val updated: Int,
    val failed: Int,
    val errors: List<MLSyncError>,
    val syncStatus: MLSyncStatus,
    val duration: Long
)

data class MLSyncError(
    val productId: UUID,
    val productSku: String,
    val error: String
)

data class MLProductMappingResponse(
    val id: UUID,
    val accountId: UUID,
    val productId: UUID,
    val mlItemId: String,
    val mlPermalink: String?,
    val mlCategoryId: String?,
    val mlCategoryName: String?,
    val listingType: MLListingType,
    val status: MLMappingStatus,
    val mlStatus: String?,
    val mlPrice: java.math.BigDecimal?,
    val mlOriginalPrice: java.math.BigDecimal?,
    val mlCurrency: String,
    val mlAvailableQuantity: Int,
    val mlSoldQuantity: Int,
    val freeShipping: Boolean,
    val shippingMode: String?,
    val healthScore: Int?,
    val healthIssues: String?,
    val lastSyncedAt: Instant?,
    val lastSyncDirection: String?,
    val syncError: String?,
    val createdAt: Instant,
    val updatedAt: Instant
)

data class MLCategoryResponse(
    val id: String,
    val name: String
)

data class MLAttributeResponse(
    val id: String,
    val name: String,
    val required: Boolean,
    val values: List<MLAttributeValue>
)

data class MLAttributeValue(
    val id: String,
    val name: String
)
