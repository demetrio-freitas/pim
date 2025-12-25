package com.pim.application

import com.fasterxml.jackson.databind.ObjectMapper
import com.pim.domain.channel.*
import com.pim.domain.product.Product
import com.pim.infrastructure.persistence.*
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.*

data class ChannelDto(
    val id: UUID? = null,
    val code: String,
    val name: String,
    val description: String? = null,
    val type: ChannelType = ChannelType.ECOMMERCE,
    val status: ChannelStatus = ChannelStatus.ACTIVE,
    val currency: String = "BRL",
    val locale: String = "pt_BR",
    val url: String? = null,
    val logoUrl: String? = null,
    val color: String? = null,
    val requiredAttributes: Set<String> = emptySet(),
    val allowedCategoryIds: Set<UUID> = emptySet(),
    val position: Int = 0,
    val settings: Map<String, Any>? = null
)

data class ChannelResponse(
    val id: UUID,
    val code: String,
    val name: String,
    val description: String?,
    val type: ChannelType,
    val status: ChannelStatus,
    val currency: String,
    val locale: String,
    val url: String?,
    val logoUrl: String?,
    val color: String?,
    val requiredAttributes: Set<String>,
    val allowedCategoryIds: Set<UUID>,
    val position: Int,
    val settings: Map<String, Any>?,
    val productCount: Long,
    val publishedCount: Long,
    val createdAt: Instant,
    val updatedAt: Instant
)

data class ProductChannelDto(
    val channelId: UUID,
    val enabled: Boolean = true,
    val channelValues: Map<String, Any>? = null
)

data class ProductChannelResponse(
    val id: UUID,
    val productId: UUID,
    val channelId: UUID,
    val channelCode: String,
    val channelName: String,
    val enabled: Boolean,
    val published: Boolean,
    val publishedAt: Instant?,
    val completenessScore: Int,
    val validationErrors: List<String>?,
    val channelValues: Map<String, Any>?,
    val createdAt: Instant,
    val updatedAt: Instant
)

data class ChannelStatsResponse(
    val channelId: UUID,
    val channelName: String,
    val totalProducts: Long,
    val publishedProducts: Long,
    val incompleteProducts: Long,
    val successfulPublications: Long,
    val failedPublications: Long
)

@Service
class ChannelService(
    private val channelRepository: ChannelRepository,
    private val productChannelRepository: ProductChannelRepository,
    private val publicationLogRepository: ChannelPublicationLogRepository,
    private val productRepository: ProductRepository,
    private val attributeRepository: AttributeRepository,
    private val objectMapper: ObjectMapper
) {

    // ==================== CHANNEL CRUD ====================

    fun getAllChannels(): List<ChannelResponse> {
        return channelRepository.findAllByOrderByPositionAsc().map { toResponse(it) }
    }

    fun getActiveChannels(): List<ChannelResponse> {
        return channelRepository.findByStatusOrderByPositionAsc(ChannelStatus.ACTIVE).map { toResponse(it) }
    }

    fun getChannel(id: UUID): ChannelResponse? {
        return channelRepository.findById(id).orElse(null)?.let { toResponse(it) }
    }

    fun getChannelByCode(code: String): ChannelResponse? {
        return channelRepository.findByCode(code)?.let { toResponse(it) }
    }

    @Transactional
    fun createChannel(dto: ChannelDto, userId: UUID? = null): ChannelResponse {
        if (channelRepository.existsByCode(dto.code)) {
            throw IllegalArgumentException("Canal com código '${dto.code}' já existe")
        }

        val channel = Channel(
            code = dto.code,
            name = dto.name,
            description = dto.description,
            type = dto.type,
            status = dto.status,
            currency = dto.currency,
            locale = dto.locale,
            url = dto.url,
            logoUrl = dto.logoUrl,
            color = dto.color,
            requiredAttributes = dto.requiredAttributes.toMutableSet(),
            allowedCategoryIds = dto.allowedCategoryIds.toMutableSet(),
            position = dto.position,
            settings = dto.settings?.let { objectMapper.writeValueAsString(it) },
            createdBy = userId
        )

        return toResponse(channelRepository.save(channel))
    }

    @Transactional
    fun updateChannel(id: UUID, dto: ChannelDto): ChannelResponse {
        val channel = channelRepository.findById(id).orElseThrow {
            IllegalArgumentException("Canal não encontrado")
        }

        // Check code uniqueness if changed
        if (dto.code != channel.code && channelRepository.existsByCode(dto.code)) {
            throw IllegalArgumentException("Canal com código '${dto.code}' já existe")
        }

        channel.apply {
            code = dto.code
            name = dto.name
            description = dto.description
            type = dto.type
            status = dto.status
            currency = dto.currency
            locale = dto.locale
            url = dto.url
            logoUrl = dto.logoUrl
            color = dto.color
            requiredAttributes = dto.requiredAttributes.toMutableSet()
            allowedCategoryIds = dto.allowedCategoryIds.toMutableSet()
            position = dto.position
            settings = dto.settings?.let { objectMapper.writeValueAsString(it) }
        }

        return toResponse(channelRepository.save(channel))
    }

    @Transactional
    fun deleteChannel(id: UUID) {
        productChannelRepository.deleteByChannelId(id)
        channelRepository.deleteById(id)
    }

    // ==================== PRODUCT-CHANNEL ASSOCIATION ====================

    fun getProductChannels(productId: UUID): List<ProductChannelResponse> {
        return productChannelRepository.findByProductId(productId).map { toResponse(it) }
    }

    fun getChannelProducts(channelId: UUID, pageable: Pageable): Page<ProductChannelResponse> {
        return productChannelRepository.findByChannelIdAndEnabled(channelId, true, pageable)
            .map { toResponse(it) }
    }

    @Transactional
    fun assignProductToChannel(productId: UUID, dto: ProductChannelDto): ProductChannelResponse {
        // Check if already exists
        val existing = productChannelRepository.findByProductIdAndChannelId(productId, dto.channelId)
        if (existing != null) {
            // Update existing
            existing.enabled = dto.enabled
            existing.channelValues = dto.channelValues?.let { objectMapper.writeValueAsString(it) }
            existing.completenessScore = calculateCompleteness(productId, dto.channelId)
            return toResponse(productChannelRepository.save(existing))
        }

        // Create new
        val productChannel = ProductChannel(
            productId = productId,
            channelId = dto.channelId,
            enabled = dto.enabled,
            channelValues = dto.channelValues?.let { objectMapper.writeValueAsString(it) },
            completenessScore = calculateCompleteness(productId, dto.channelId)
        )

        return toResponse(productChannelRepository.save(productChannel))
    }

    @Transactional
    fun removeProductFromChannel(productId: UUID, channelId: UUID) {
        productChannelRepository.findByProductIdAndChannelId(productId, channelId)?.let {
            productChannelRepository.delete(it)
        }
    }

    @Transactional
    fun publishToChannel(productId: UUID, channelId: UUID, userId: UUID? = null): ProductChannelResponse {
        val productChannel = productChannelRepository.findByProductIdAndChannelId(productId, channelId)
            ?: throw IllegalArgumentException("Produto não está associado a este canal")

        val channel = channelRepository.findById(channelId).orElseThrow {
            IllegalArgumentException("Canal não encontrado")
        }

        // Validate completeness
        val completeness = calculateCompleteness(productId, channelId)
        if (completeness < 100) {
            val errors = validateProductForChannel(productId, channelId)
            productChannel.validationErrors = objectMapper.writeValueAsString(errors)
            productChannelRepository.save(productChannel)

            // Log failure
            logPublication(productId, channelId, PublicationAction.PUBLISH, false,
                "Produto incompleto para este canal: ${errors.joinToString(", ")}", userId)

            throw IllegalArgumentException("Produto não atende aos requisitos do canal: ${errors.joinToString(", ")}")
        }

        // Publish
        productChannel.published = true
        productChannel.publishedAt = Instant.now()
        productChannel.completenessScore = completeness
        productChannel.validationErrors = null

        val result = productChannelRepository.save(productChannel)

        // Log success
        logPublication(productId, channelId, PublicationAction.PUBLISH, true, null, userId)

        return toResponse(result)
    }

    @Transactional
    fun unpublishFromChannel(productId: UUID, channelId: UUID, userId: UUID? = null): ProductChannelResponse {
        val productChannel = productChannelRepository.findByProductIdAndChannelId(productId, channelId)
            ?: throw IllegalArgumentException("Produto não está associado a este canal")

        productChannel.published = false

        val result = productChannelRepository.save(productChannel)

        // Log
        logPublication(productId, channelId, PublicationAction.UNPUBLISH, true, null, userId)

        return toResponse(result)
    }

    @Transactional
    fun bulkPublishToChannel(channelId: UUID, productIds: List<UUID>, userId: UUID? = null): Map<String, Any> {
        var successCount = 0
        var errorCount = 0
        val errors = mutableListOf<Map<String, Any>>()

        for (productId in productIds) {
            try {
                publishToChannel(productId, channelId, userId)
                successCount++
            } catch (e: Exception) {
                errorCount++
                errors.add(mapOf(
                    "productId" to productId.toString(),
                    "error" to (e.message ?: "Erro desconhecido")
                ))
            }
        }

        return mapOf(
            "successCount" to successCount,
            "errorCount" to errorCount,
            "errors" to errors
        )
    }

    // ==================== COMPLETENESS & VALIDATION ====================

    fun calculateCompleteness(productId: UUID, channelId: UUID): Int {
        val channel = channelRepository.findById(channelId).orElse(null) ?: return 0
        val product = productRepository.findById(productId).orElse(null) ?: return 0

        if (channel.requiredAttributes.isEmpty()) {
            // If no required attributes, check basic fields
            return calculateBasicCompleteness(product)
        }

        val requiredCount = channel.requiredAttributes.size
        var filledCount = 0

        // Build map of product attribute values by code
        val productValues = product.attributes.associate { pa ->
            pa.attribute.code to pa.getValue()
        }

        for (attrCode in channel.requiredAttributes) {
            val value = productValues[attrCode]
            if (value != null && value.toString().isNotBlank()) {
                filledCount++
            }
        }

        // Also check basic fields as part of completeness
        val basicScore = calculateBasicCompleteness(product)
        val attrScore = if (requiredCount > 0) (filledCount * 100) / requiredCount else 100

        return (basicScore * 0.3 + attrScore * 0.7).toInt()
    }

    private fun calculateBasicCompleteness(product: Product): Int {
        var score = 0
        val total = 5

        if (product.name.isNotBlank()) score++
        if (!product.description.isNullOrBlank()) score++
        if (product.sku.isNotBlank()) score++
        if (product.price != null && product.price!! > java.math.BigDecimal.ZERO) score++
        if (product.categories.isNotEmpty()) score++

        return (score * 100) / total
    }

    fun validateProductForChannel(productId: UUID, channelId: UUID): List<String> {
        val channel = channelRepository.findById(channelId).orElse(null)
            ?: return listOf("Canal não encontrado")
        val product = productRepository.findById(productId).orElse(null)
            ?: return listOf("Produto não encontrado")

        val errors = mutableListOf<String>()

        // Basic validations
        if (product.name.isBlank()) errors.add("Nome do produto é obrigatório")
        if (product.sku.isBlank()) errors.add("SKU é obrigatório")

        // Channel-specific validations - Build map from product attributes
        val productValues = product.attributes.associate { pa ->
            pa.attribute.code to pa.getValue()
        }

        for (attrCode in channel.requiredAttributes) {
            val value = productValues[attrCode]
            if (value == null || value.toString().isBlank()) {
                // Get attribute name
                val attr = attributeRepository.findByCode(attrCode)
                val attrName = attr?.name ?: attrCode
                errors.add("Atributo '$attrName' é obrigatório para este canal")
            }
        }

        // Category validation
        if (channel.allowedCategoryIds.isNotEmpty()) {
            val productCategoryIds = product.categories.map { it.id }
            if (productCategoryIds.none { it in channel.allowedCategoryIds }) {
                errors.add("Produto não está em uma categoria permitida para este canal")
            }
        }

        return errors
    }

    // ==================== STATISTICS ====================

    fun getChannelStats(channelId: UUID): ChannelStatsResponse {
        val channel = channelRepository.findById(channelId).orElseThrow {
            IllegalArgumentException("Canal não encontrado")
        }

        val totalProducts = productChannelRepository.countEnabledByChannelId(channelId)
        val publishedProducts = productChannelRepository.countPublishedByChannelId(channelId)
        val successfulPublications = publicationLogRepository.countSuccessByChannelId(channelId)
        val failedPublications = publicationLogRepository.countFailuresByChannelId(channelId)

        // Count incomplete
        val incompleteProducts = totalProducts - publishedProducts

        return ChannelStatsResponse(
            channelId = channelId,
            channelName = channel.name,
            totalProducts = totalProducts,
            publishedProducts = publishedProducts,
            incompleteProducts = incompleteProducts,
            successfulPublications = successfulPublications,
            failedPublications = failedPublications
        )
    }

    fun getAllChannelStats(): List<ChannelStatsResponse> {
        return channelRepository.findByStatusOrderByPositionAsc(ChannelStatus.ACTIVE)
            .map { getChannelStats(it.id) }
    }

    // ==================== HELPERS ====================

    @Suppress("UNCHECKED_CAST")
    private fun parseJsonToMap(json: String?): Map<String, Any> {
        if (json.isNullOrBlank()) return emptyMap()
        return try {
            objectMapper.readValue(json, Map::class.java) as Map<String, Any>
        } catch (e: Exception) {
            emptyMap()
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseJsonToList(json: String?): List<String> {
        if (json.isNullOrBlank()) return emptyList()
        return try {
            objectMapper.readValue(json, List::class.java) as List<String>
        } catch (e: Exception) {
            emptyList()
        }
    }

    private fun logPublication(
        productId: UUID,
        channelId: UUID,
        action: PublicationAction,
        success: Boolean,
        errorMessage: String?,
        userId: UUID?
    ) {
        val log = ChannelPublicationLog(
            productId = productId,
            channelId = channelId,
            action = action,
            success = success,
            errorMessage = errorMessage,
            userId = userId
        )
        publicationLogRepository.save(log)
    }

    private fun toResponse(channel: Channel): ChannelResponse {
        val productCount = productChannelRepository.countEnabledByChannelId(channel.id)
        val publishedCount = productChannelRepository.countPublishedByChannelId(channel.id)

        val settings: Map<String, Any>? = if (channel.settings != null) {
            parseJsonToMap(channel.settings).takeIf { it.isNotEmpty() }
        } else null

        return ChannelResponse(
            id = channel.id,
            code = channel.code,
            name = channel.name,
            description = channel.description,
            type = channel.type,
            status = channel.status,
            currency = channel.currency,
            locale = channel.locale,
            url = channel.url,
            logoUrl = channel.logoUrl,
            color = channel.color,
            requiredAttributes = channel.requiredAttributes,
            allowedCategoryIds = channel.allowedCategoryIds,
            position = channel.position,
            settings = settings,
            productCount = productCount,
            publishedCount = publishedCount,
            createdAt = channel.createdAt,
            updatedAt = channel.updatedAt
        )
    }

    private fun toResponse(pc: ProductChannel): ProductChannelResponse {
        val channel = channelRepository.findById(pc.channelId).orElse(null)

        val channelValues: Map<String, Any>? = if (pc.channelValues != null) {
            parseJsonToMap(pc.channelValues).takeIf { it.isNotEmpty() }
        } else null

        val validationErrors: List<String>? = if (pc.validationErrors != null) {
            parseJsonToList(pc.validationErrors).takeIf { it.isNotEmpty() }
        } else null

        return ProductChannelResponse(
            id = pc.id,
            productId = pc.productId,
            channelId = pc.channelId,
            channelCode = channel?.code ?: "",
            channelName = channel?.name ?: "",
            enabled = pc.enabled,
            published = pc.published,
            publishedAt = pc.publishedAt,
            completenessScore = pc.completenessScore,
            validationErrors = validationErrors,
            channelValues = channelValues,
            createdAt = pc.createdAt,
            updatedAt = pc.updatedAt
        )
    }
}
