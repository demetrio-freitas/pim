package com.pim.application

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import com.pim.domain.product.InventoryPolicy
import com.pim.domain.product.Product
import com.pim.domain.product.WeightUnit
import com.pim.domain.shopify.*
import com.pim.infrastructure.persistence.*
import org.slf4j.LoggerFactory
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpMethod
import org.springframework.http.MediaType
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.client.RestTemplate
import java.math.BigDecimal
import java.time.Instant
import java.util.*

// ==================== DTOs ====================

data class ShopifyStoreCreateRequest(
    val name: String,
    val shopDomain: String,
    val accessToken: String,
    val description: String? = null,
    val apiVersion: String = "2024-01",
    val syncProducts: Boolean = true,
    val syncInventory: Boolean = true,
    val syncPrices: Boolean = true,
    val syncImages: Boolean = true,
    val syncDirection: SyncDirection = SyncDirection.PIM_TO_SHOPIFY,
    val autoSyncEnabled: Boolean = false,
    val syncIntervalMinutes: Int = 60,
    val defaultProductType: String? = null,
    val defaultVendor: String? = null
)

data class ShopifyStoreUpdateRequest(
    val name: String? = null,
    val accessToken: String? = null,
    val description: String? = null,
    val apiVersion: String? = null,
    val status: ShopifyStoreStatus? = null,
    val syncProducts: Boolean? = null,
    val syncInventory: Boolean? = null,
    val syncPrices: Boolean? = null,
    val syncImages: Boolean? = null,
    val syncDirection: SyncDirection? = null,
    val autoSyncEnabled: Boolean? = null,
    val syncIntervalMinutes: Int? = null,
    val defaultProductType: String? = null,
    val defaultVendor: String? = null
)

data class ShopifyStoreResponse(
    val id: UUID,
    val name: String,
    val shopDomain: String,
    val apiVersion: String,
    val status: ShopifyStoreStatus,
    val description: String?,
    val syncProducts: Boolean,
    val syncInventory: Boolean,
    val syncPrices: Boolean,
    val syncImages: Boolean,
    val syncDirection: SyncDirection,
    val autoSyncEnabled: Boolean,
    val syncIntervalMinutes: Int,
    val defaultProductType: String?,
    val defaultVendor: String?,
    val shopName: String?,
    val shopEmail: String?,
    val shopCurrency: String?,
    val productsSynced: Int,
    val lastSyncAt: Instant?,
    val lastSyncStatus: SyncStatus?,
    val lastSyncMessage: String?,
    val createdAt: Instant,
    val updatedAt: Instant
)

data class ShopifySyncLogResponse(
    val id: UUID,
    val storeId: UUID,
    val type: SyncLogType,
    val status: SyncStatus,
    val direction: SyncDirection,
    val entityType: String?,
    val entityId: UUID?,
    val shopifyId: String?,
    val itemsProcessed: Int,
    val itemsCreated: Int,
    val itemsUpdated: Int,
    val itemsFailed: Int,
    val itemsSkipped: Int,
    val startedAt: Instant,
    val completedAt: Instant?,
    val durationMs: Long?,
    val message: String?,
    val triggeredBy: String?
)

data class ShopifyProductMappingResponse(
    val id: UUID,
    val storeId: UUID,
    val productId: UUID,
    val shopifyProductId: String,
    val shopifyVariantId: String?,
    val shopifyHandle: String?,
    val status: MappingStatus,
    val lastSyncedAt: Instant?,
    val lastSyncDirection: SyncDirection?,
    val createdAt: Instant
)

data class SyncProductRequest(
    val productIds: List<UUID>? = null, // null = sync all
    val force: Boolean = false
)

data class SyncResultResponse(
    val success: Boolean,
    val message: String,
    val itemsProcessed: Int,
    val itemsCreated: Int,
    val itemsUpdated: Int,
    val itemsFailed: Int,
    val errors: List<String> = emptyList()
)

// ==================== Service ====================

@Service
@Transactional
class ShopifyService(
    private val storeRepository: ShopifyStoreRepository,
    private val syncLogRepository: ShopifySyncLogRepository,
    private val mappingRepository: ShopifyProductMappingRepository,
    private val productRepository: ProductRepository,
    private val objectMapper: ObjectMapper
) {
    private val logger = LoggerFactory.getLogger(ShopifyService::class.java)
    private val restTemplate = RestTemplate()

    // ==================== Store Management ====================

    fun createStore(request: ShopifyStoreCreateRequest, createdBy: UUID?): ShopifyStoreResponse {
        if (storeRepository.existsByShopDomain(request.shopDomain)) {
            throw IllegalArgumentException("Já existe uma loja com este domínio Shopify")
        }
        if (storeRepository.existsByName(request.name)) {
            throw IllegalArgumentException("Já existe uma loja com este nome")
        }

        val store = ShopifyStore(
            name = request.name,
            shopDomain = normalizeDomain(request.shopDomain),
            accessToken = request.accessToken, // In production, encrypt this
            apiVersion = request.apiVersion,
            description = request.description,
            syncProducts = request.syncProducts,
            syncInventory = request.syncInventory,
            syncPrices = request.syncPrices,
            syncImages = request.syncImages,
            syncDirection = request.syncDirection,
            autoSyncEnabled = request.autoSyncEnabled,
            syncIntervalMinutes = request.syncIntervalMinutes,
            defaultProductType = request.defaultProductType,
            defaultVendor = request.defaultVendor,
            createdBy = createdBy,
            webhookSecret = generateWebhookSecret()
        )

        // Validate connection and fetch store info
        try {
            val shopInfo = fetchShopInfo(store)
            store.shopName = shopInfo["name"] as? String
            store.shopEmail = shopInfo["email"] as? String
            store.shopCurrency = shopInfo["currency"] as? String
            store.shopTimezone = shopInfo["timezone"] as? String
            store.status = ShopifyStoreStatus.ACTIVE
        } catch (e: Exception) {
            logger.warn("Could not fetch shop info for ${store.shopDomain}: ${e.message}")
            store.status = ShopifyStoreStatus.ERROR
            store.lastSyncMessage = "Erro ao conectar: ${e.message}"
        }

        val saved = storeRepository.save(store)
        return saved.toResponse()
    }

    fun updateStore(id: UUID, request: ShopifyStoreUpdateRequest): ShopifyStoreResponse {
        val store = storeRepository.findById(id)
            .orElseThrow { IllegalArgumentException("Loja Shopify não encontrada") }

        request.name?.let {
            if (it != store.name && storeRepository.existsByName(it)) {
                throw IllegalArgumentException("Já existe uma loja com este nome")
            }
            store.name = it
        }
        request.accessToken?.let { store.accessToken = it }
        request.description?.let { store.description = it }
        request.apiVersion?.let { store.apiVersion = it }
        request.status?.let { store.status = it }
        request.syncProducts?.let { store.syncProducts = it }
        request.syncInventory?.let { store.syncInventory = it }
        request.syncPrices?.let { store.syncPrices = it }
        request.syncImages?.let { store.syncImages = it }
        request.syncDirection?.let { store.syncDirection = it }
        request.autoSyncEnabled?.let { store.autoSyncEnabled = it }
        request.syncIntervalMinutes?.let { store.syncIntervalMinutes = it }
        request.defaultProductType?.let { store.defaultProductType = it }
        request.defaultVendor?.let { store.defaultVendor = it }

        store.updatedAt = Instant.now()

        val saved = storeRepository.save(store)
        return saved.toResponse()
    }

    /**
     * Delete a Shopify store and all its mappings.
     * Uses @Transactional to ensure both deletions happen atomically -
     * if store deletion fails, mapping deletions are rolled back.
     */
    fun deleteStore(id: UUID) {
        // Verify store exists first
        if (!storeRepository.existsById(id)) {
            throw IllegalArgumentException("Loja Shopify não encontrada")
        }

        // Delete in correct order: mappings first (foreign key), then store
        // This happens within a transaction, so if anything fails, it's rolled back
        val mappingCount = mappingRepository.countByStoreId(id)
        mappingRepository.deleteByStoreId(id)
        storeRepository.deleteById(id)

        logger.info("Deleted Shopify store $id with $mappingCount product mappings")
    }

    fun getStoreById(id: UUID): ShopifyStoreResponse? {
        return storeRepository.findById(id).orElse(null)?.toResponse()
    }

    fun getAllStores(pageable: Pageable): Page<ShopifyStoreResponse> {
        return storeRepository.findAll(pageable).map { it.toResponse() }
    }

    fun testConnection(id: UUID): Map<String, Any> {
        val store = storeRepository.findById(id)
            .orElseThrow { IllegalArgumentException("Loja Shopify não encontrada") }

        return try {
            val shopInfo = fetchShopInfo(store)
            store.shopName = shopInfo["name"] as? String
            store.shopEmail = shopInfo["email"] as? String
            store.shopCurrency = shopInfo["currency"] as? String
            store.status = ShopifyStoreStatus.ACTIVE
            store.lastSyncMessage = null
            store.updatedAt = Instant.now()
            storeRepository.save(store)

            mapOf(
                "success" to true,
                "message" to "Conexão bem sucedida",
                "shopName" to (store.shopName ?: ""),
                "shopEmail" to (store.shopEmail ?: ""),
                "shopCurrency" to (store.shopCurrency ?: "")
            )
        } catch (e: Exception) {
            store.status = ShopifyStoreStatus.ERROR
            store.lastSyncMessage = "Erro: ${e.message}"
            store.updatedAt = Instant.now()
            storeRepository.save(store)

            mapOf(
                "success" to false,
                "message" to "Erro ao conectar: ${e.message}"
            )
        }
    }

    // ==================== Sync Operations ====================

    fun syncProductsToShopify(storeId: UUID, request: SyncProductRequest, triggeredByUserId: UUID?): SyncResultResponse {
        val store = storeRepository.findById(storeId)
            .orElseThrow { IllegalArgumentException("Loja Shopify não encontrada") }

        if (!store.isActive()) {
            throw IllegalStateException("Loja não está ativa")
        }

        val syncLog = ShopifySyncLog(
            storeId = storeId,
            type = if (request.productIds.isNullOrEmpty()) SyncLogType.FULL_SYNC else SyncLogType.INCREMENTAL_SYNC,
            direction = SyncDirection.PIM_TO_SHOPIFY,
            triggeredBy = "manual",
            triggeredByUserId = triggeredByUserId
        )
        syncLogRepository.save(syncLog)

        val errors = mutableListOf<String>()

        try {
            // Get products to sync
            val products = if (request.productIds.isNullOrEmpty()) {
                productRepository.findAll()
            } else {
                productRepository.findAllById(request.productIds)
            }

            products.forEach { product ->
                try {
                    syncProductToShopify(store, product, syncLog)
                    syncLog.itemsProcessed++
                } catch (e: Exception) {
                    syncLog.itemsFailed++
                    errors.add("Produto ${product.sku}: ${e.message}")
                    logger.error("Error syncing product ${product.id} to Shopify: ${e.message}")
                }
            }

            syncLog.complete(
                if (syncLog.itemsFailed > 0) SyncStatus.PARTIAL else SyncStatus.SUCCESS,
                "Sincronização concluída: ${syncLog.itemsCreated} criados, ${syncLog.itemsUpdated} atualizados, ${syncLog.itemsFailed} falhas"
            )

            // Update store stats
            store.lastSyncAt = Instant.now()
            store.lastSyncStatus = syncLog.status
            store.lastSyncMessage = syncLog.message
            store.productsSynced = mappingRepository.countByStoreId(storeId).toInt()
            storeRepository.save(store)

        } catch (e: Exception) {
            syncLog.fail(e.message ?: "Erro desconhecido", e.stackTraceToString())
            store.lastSyncStatus = SyncStatus.FAILED
            store.lastSyncMessage = e.message
            storeRepository.save(store)
        }

        syncLogRepository.save(syncLog)

        return SyncResultResponse(
            success = syncLog.status != SyncStatus.FAILED,
            message = syncLog.message ?: "",
            itemsProcessed = syncLog.itemsProcessed,
            itemsCreated = syncLog.itemsCreated,
            itemsUpdated = syncLog.itemsUpdated,
            itemsFailed = syncLog.itemsFailed,
            errors = errors
        )
    }

    private fun syncProductToShopify(store: ShopifyStore, product: Product, syncLog: ShopifySyncLog) {
        val existingMapping = mappingRepository.findByStoreIdAndProductId(store.id, product.id)

        val shopifyProduct = buildShopifyProductPayload(store, product)

        if (existingMapping != null) {
            // Update existing product
            val response = callShopifyApi(
                store,
                HttpMethod.PUT,
                "/products/${existingMapping.shopifyProductId}.json",
                mapOf("product" to shopifyProduct)
            )
            existingMapping.lastSyncedAt = Instant.now()
            existingMapping.lastSyncDirection = SyncDirection.PIM_TO_SHOPIFY
            existingMapping.updatedAt = Instant.now()
            mappingRepository.save(existingMapping)
            syncLog.itemsUpdated++
        } else {
            // Create new product
            val response = callShopifyApi(
                store,
                HttpMethod.POST,
                "/products.json",
                mapOf("product" to shopifyProduct)
            )

            val shopifyProductId = response.get("product")?.get("id")?.asText()
                ?: throw IllegalStateException("Shopify did not return product ID")

            val shopifyVariantId = response.get("product")?.get("variants")?.get(0)?.get("id")?.asText()
            val shopifyHandle = response.get("product")?.get("handle")?.asText()

            val mapping = ShopifyProductMapping(
                storeId = store.id,
                productId = product.id,
                shopifyProductId = shopifyProductId,
                shopifyVariantId = shopifyVariantId,
                shopifyHandle = shopifyHandle,
                lastSyncedAt = Instant.now(),
                lastSyncDirection = SyncDirection.PIM_TO_SHOPIFY
            )
            mappingRepository.save(mapping)

            // Update product with Shopify IDs
            product.shopifyProductId = shopifyProductId
            product.shopifyVariantId = shopifyVariantId
            product.shopifySyncedAt = Instant.now()
            productRepository.save(product)

            syncLog.itemsCreated++
        }
    }

    private fun buildShopifyProductPayload(store: ShopifyStore, product: Product): Map<String, Any?> {
        val variant = mapOf(
            "sku" to product.sku,
            "price" to product.price?.toString(),
            "compare_at_price" to product.compareAtPrice?.toString(),
            "barcode" to product.barcode,
            "weight" to product.weight.toDouble(),
            "weight_unit" to (product.weightUnit.name.lowercase()),
            "inventory_policy" to (if (product.inventoryPolicy == InventoryPolicy.CONTINUE) "continue" else "deny"),
            "inventory_management" to product.inventoryManagement,
            "requires_shipping" to product.requiresShipping,
            "taxable" to product.taxable,
            "fulfillment_service" to (product.fulfillmentService ?: "manual")
        )

        return mapOf(
            "title" to product.name,
            "body_html" to product.description,
            "vendor" to (product.vendor ?: product.brand ?: store.defaultVendor),
            "product_type" to (product.productType ?: store.defaultProductType),
            "tags" to product.tags,
            "handle" to (product.urlKey ?: generateHandle(product.name)),
            "status" to mapProductStatus(product),
            "published_scope" to product.publishedScope,
            "template_suffix" to product.templateSuffix,
            "variants" to listOf(variant)
        )
    }

    private fun mapProductStatus(product: Product): String {
        return when (product.status) {
            com.pim.domain.product.ProductStatus.PUBLISHED -> "active"
            com.pim.domain.product.ProductStatus.ARCHIVED -> "archived"
            else -> "draft"
        }
    }

    private fun generateHandle(title: String): String {
        return title.lowercase()
            .replace(Regex("[^a-z0-9\\s-]"), "")
            .replace(Regex("\\s+"), "-")
            .trim('-')
    }

    // ==================== Sync Logs ====================

    fun getSyncLogs(storeId: UUID, pageable: Pageable): Page<ShopifySyncLogResponse> {
        return syncLogRepository.findByStoreId(storeId, pageable).map { it.toResponse() }
    }

    // ==================== Product Mappings ====================

    fun getProductMappings(storeId: UUID, pageable: Pageable): Page<ShopifyProductMappingResponse> {
        return mappingRepository.findByStoreId(storeId, pageable).map { it.toResponse() }
    }

    fun unlinkProduct(storeId: UUID, productId: UUID) {
        val mapping = mappingRepository.findByStoreIdAndProductId(storeId, productId)
            ?: throw IllegalArgumentException("Mapeamento não encontrado")

        // Clear Shopify IDs from product
        val product = productRepository.findById(productId).orElse(null)
        if (product != null) {
            product.shopifyProductId = null
            product.shopifyVariantId = null
            product.shopifyInventoryItemId = null
            product.shopifySyncedAt = null
            productRepository.save(product)
        }

        mappingRepository.delete(mapping)
    }

    // ==================== Shopify API Helpers ====================

    private fun fetchShopInfo(store: ShopifyStore): Map<String, Any?> {
        val response = callShopifyApi(store, HttpMethod.GET, "/shop.json", null)
        val shop = response.get("shop") ?: throw IllegalStateException("Invalid Shopify response")

        return mapOf(
            "name" to shop.get("name")?.asText(),
            "email" to shop.get("email")?.asText(),
            "currency" to shop.get("currency")?.asText(),
            "timezone" to shop.get("iana_timezone")?.asText()
        )
    }

    private fun callShopifyApi(
        store: ShopifyStore,
        method: HttpMethod,
        endpoint: String,
        body: Any?
    ): JsonNode {
        val url = "${store.getApiUrl()}$endpoint"

        val headers = HttpHeaders().apply {
            contentType = MediaType.APPLICATION_JSON
            set("X-Shopify-Access-Token", store.accessToken)
        }

        val entity = if (body != null) {
            HttpEntity(objectMapper.writeValueAsString(body), headers)
        } else {
            HttpEntity<String>(headers)
        }

        val response = restTemplate.exchange(url, method, entity, String::class.java)

        if (!response.statusCode.is2xxSuccessful) {
            throw IllegalStateException("Shopify API error: ${response.statusCode}")
        }

        return objectMapper.readTree(response.body ?: "{}")
    }

    private fun normalizeDomain(domain: String): String {
        return domain
            .replace("https://", "")
            .replace("http://", "")
            .replace("/", "")
            .trim()
    }

    private fun generateWebhookSecret(): String {
        val bytes = ByteArray(32)
        java.security.SecureRandom().nextBytes(bytes)
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
    }

    // ==================== Extension Functions ====================

    private fun ShopifyStore.toResponse() = ShopifyStoreResponse(
        id = id,
        name = name,
        shopDomain = shopDomain,
        apiVersion = apiVersion,
        status = status,
        description = description,
        syncProducts = syncProducts,
        syncInventory = syncInventory,
        syncPrices = syncPrices,
        syncImages = syncImages,
        syncDirection = syncDirection,
        autoSyncEnabled = autoSyncEnabled,
        syncIntervalMinutes = syncIntervalMinutes,
        defaultProductType = defaultProductType,
        defaultVendor = defaultVendor,
        shopName = shopName,
        shopEmail = shopEmail,
        shopCurrency = shopCurrency,
        productsSynced = productsSynced,
        lastSyncAt = lastSyncAt,
        lastSyncStatus = lastSyncStatus,
        lastSyncMessage = lastSyncMessage,
        createdAt = createdAt,
        updatedAt = updatedAt
    )

    private fun ShopifySyncLog.toResponse() = ShopifySyncLogResponse(
        id = id,
        storeId = storeId,
        type = type,
        status = status,
        direction = direction,
        entityType = entityType,
        entityId = entityId,
        shopifyId = shopifyId,
        itemsProcessed = itemsProcessed,
        itemsCreated = itemsCreated,
        itemsUpdated = itemsUpdated,
        itemsFailed = itemsFailed,
        itemsSkipped = itemsSkipped,
        startedAt = startedAt,
        completedAt = completedAt,
        durationMs = durationMs,
        message = message,
        triggeredBy = triggeredBy
    )

    private fun ShopifyProductMapping.toResponse() = ShopifyProductMappingResponse(
        id = id,
        storeId = storeId,
        productId = productId,
        shopifyProductId = shopifyProductId,
        shopifyVariantId = shopifyVariantId,
        shopifyHandle = shopifyHandle,
        status = status,
        lastSyncedAt = lastSyncedAt,
        lastSyncDirection = lastSyncDirection,
        createdAt = createdAt
    )
}
