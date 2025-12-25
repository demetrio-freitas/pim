package com.pim.infrastructure.web

import com.pim.application.*
import com.pim.domain.channel.ChannelStatus
import com.pim.domain.channel.ChannelType
import com.pim.domain.user.User
import com.pim.infrastructure.persistence.UserRepository
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PageableDefault
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.web.bind.annotation.*
import java.util.*

// Request DTOs
data class CreateChannelRequest(
    val code: String,
    val name: String,
    val description: String? = null,
    val type: ChannelType = ChannelType.ECOMMERCE,
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

data class UpdateChannelRequest(
    val code: String? = null,
    val name: String? = null,
    val description: String? = null,
    val type: ChannelType? = null,
    val status: ChannelStatus? = null,
    val currency: String? = null,
    val locale: String? = null,
    val url: String? = null,
    val logoUrl: String? = null,
    val color: String? = null,
    val requiredAttributes: Set<String>? = null,
    val allowedCategoryIds: Set<UUID>? = null,
    val position: Int? = null,
    val settings: Map<String, Any>? = null
)

data class AssignChannelRequest(
    val channelId: UUID,
    val enabled: Boolean = true,
    val channelValues: Map<String, Any>? = null
)

data class BulkPublishRequest(
    val productIds: List<UUID>
)

@RestController
@RequestMapping("/api/channels")
@Tag(name = "Channels", description = "Channel management endpoints")
class ChannelController(
    private val channelService: ChannelService,
    private val userRepository: UserRepository
) {

    private fun getUser(userDetails: UserDetails): User? {
        return userRepository.findByEmail(userDetails.username)
    }

    // ==================== CHANNEL CRUD ====================

    @GetMapping
    @Operation(summary = "List all channels")
    @PreAuthorize("hasAuthority('settings.view')")
    fun listChannels(): ResponseEntity<List<ChannelResponse>> {
        return ResponseEntity.ok(channelService.getAllChannels())
    }

    @GetMapping("/active")
    @Operation(summary = "List active channels")
    @PreAuthorize("hasAuthority('products.view')")
    fun listActiveChannels(): ResponseEntity<List<ChannelResponse>> {
        return ResponseEntity.ok(channelService.getActiveChannels())
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get channel by ID")
    @PreAuthorize("hasAuthority('settings.view')")
    fun getChannel(@PathVariable id: UUID): ResponseEntity<ChannelResponse> {
        val channel = channelService.getChannel(id)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(channel)
    }

    @GetMapping("/code/{code}")
    @Operation(summary = "Get channel by code")
    @PreAuthorize("hasAuthority('settings.view')")
    fun getChannelByCode(@PathVariable code: String): ResponseEntity<ChannelResponse> {
        val channel = channelService.getChannelByCode(code)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(channel)
    }

    @PostMapping
    @Operation(summary = "Create a new channel")
    @PreAuthorize("hasAuthority('settings.manage')")
    fun createChannel(
        @RequestBody request: CreateChannelRequest,
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<ChannelResponse> {
        val user = getUser(userDetails)
        val dto = ChannelDto(
            code = request.code,
            name = request.name,
            description = request.description,
            type = request.type,
            currency = request.currency,
            locale = request.locale,
            url = request.url,
            logoUrl = request.logoUrl,
            color = request.color,
            requiredAttributes = request.requiredAttributes,
            allowedCategoryIds = request.allowedCategoryIds,
            position = request.position,
            settings = request.settings
        )

        val channel = channelService.createChannel(dto, user?.id)
        return ResponseEntity.ok(channel)
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a channel")
    @PreAuthorize("hasAuthority('settings.manage')")
    fun updateChannel(
        @PathVariable id: UUID,
        @RequestBody request: UpdateChannelRequest
    ): ResponseEntity<ChannelResponse> {
        val existing = channelService.getChannel(id)
            ?: return ResponseEntity.notFound().build()

        val dto = ChannelDto(
            id = id,
            code = request.code ?: existing.code,
            name = request.name ?: existing.name,
            description = request.description ?: existing.description,
            type = request.type ?: existing.type,
            status = request.status ?: existing.status,
            currency = request.currency ?: existing.currency,
            locale = request.locale ?: existing.locale,
            url = request.url ?: existing.url,
            logoUrl = request.logoUrl ?: existing.logoUrl,
            color = request.color ?: existing.color,
            requiredAttributes = request.requiredAttributes ?: existing.requiredAttributes,
            allowedCategoryIds = request.allowedCategoryIds ?: existing.allowedCategoryIds,
            position = request.position ?: existing.position,
            settings = request.settings ?: existing.settings
        )

        val channel = channelService.updateChannel(id, dto)
        return ResponseEntity.ok(channel)
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a channel")
    @PreAuthorize("hasAuthority('settings.manage')")
    fun deleteChannel(@PathVariable id: UUID): ResponseEntity<Void> {
        channelService.deleteChannel(id)
        return ResponseEntity.noContent().build()
    }

    // ==================== CHANNEL TYPES & METADATA ====================

    @GetMapping("/types")
    @Operation(summary = "Get available channel types")
    fun getChannelTypes(): ResponseEntity<List<Map<String, String>>> {
        val types = ChannelType.entries.map {
            mapOf(
                "value" to it.name,
                "label" to when (it) {
                    ChannelType.ECOMMERCE -> "E-commerce"
                    ChannelType.MARKETPLACE -> "Marketplace"
                    ChannelType.CATALOG -> "Catálogo"
                    ChannelType.MOBILE_APP -> "Aplicativo Móvel"
                    ChannelType.POS -> "Ponto de Venda"
                    ChannelType.B2B -> "Portal B2B"
                    ChannelType.SOCIAL -> "Redes Sociais"
                    ChannelType.CUSTOM -> "Personalizado"
                }
            )
        }
        return ResponseEntity.ok(types)
    }

    // ==================== PRODUCT-CHANNEL OPERATIONS ====================

    @GetMapping("/product/{productId}")
    @Operation(summary = "Get channels for a product")
    @PreAuthorize("hasAuthority('products.view')")
    fun getProductChannels(@PathVariable productId: UUID): ResponseEntity<List<ProductChannelResponse>> {
        return ResponseEntity.ok(channelService.getProductChannels(productId))
    }

    @GetMapping("/{channelId}/products")
    @Operation(summary = "Get products in a channel")
    @PreAuthorize("hasAuthority('products.view')")
    fun getChannelProducts(
        @PathVariable channelId: UUID,
        @PageableDefault(size = 20) pageable: Pageable
    ): ResponseEntity<Page<ProductChannelResponse>> {
        return ResponseEntity.ok(channelService.getChannelProducts(channelId, pageable))
    }

    @PostMapping("/product/{productId}/assign")
    @Operation(summary = "Assign product to a channel")
    @PreAuthorize("hasAuthority('products.update')")
    fun assignProductToChannel(
        @PathVariable productId: UUID,
        @RequestBody request: AssignChannelRequest
    ): ResponseEntity<ProductChannelResponse> {
        val dto = ProductChannelDto(
            channelId = request.channelId,
            enabled = request.enabled,
            channelValues = request.channelValues
        )
        return ResponseEntity.ok(channelService.assignProductToChannel(productId, dto))
    }

    @DeleteMapping("/product/{productId}/channel/{channelId}")
    @Operation(summary = "Remove product from a channel")
    @PreAuthorize("hasAuthority('products.update')")
    fun removeProductFromChannel(
        @PathVariable productId: UUID,
        @PathVariable channelId: UUID
    ): ResponseEntity<Void> {
        channelService.removeProductFromChannel(productId, channelId)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/product/{productId}/channel/{channelId}/publish")
    @Operation(summary = "Publish product to a channel")
    @PreAuthorize("hasAuthority('products.publish')")
    fun publishToChannel(
        @PathVariable productId: UUID,
        @PathVariable channelId: UUID,
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<ProductChannelResponse> {
        val user = getUser(userDetails)
        return ResponseEntity.ok(channelService.publishToChannel(productId, channelId, user?.id))
    }

    @PostMapping("/product/{productId}/channel/{channelId}/unpublish")
    @Operation(summary = "Unpublish product from a channel")
    @PreAuthorize("hasAuthority('products.publish')")
    fun unpublishFromChannel(
        @PathVariable productId: UUID,
        @PathVariable channelId: UUID,
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<ProductChannelResponse> {
        val user = getUser(userDetails)
        return ResponseEntity.ok(channelService.unpublishFromChannel(productId, channelId, user?.id))
    }

    @PostMapping("/{channelId}/bulk-publish")
    @Operation(summary = "Bulk publish products to a channel")
    @PreAuthorize("hasAuthority('products.publish')")
    fun bulkPublishToChannel(
        @PathVariable channelId: UUID,
        @RequestBody request: BulkPublishRequest,
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<Map<String, Any>> {
        val user = getUser(userDetails)
        return ResponseEntity.ok(channelService.bulkPublishToChannel(channelId, request.productIds, user?.id))
    }

    // ==================== VALIDATION & COMPLETENESS ====================

    @GetMapping("/product/{productId}/channel/{channelId}/validate")
    @Operation(summary = "Validate product for a channel")
    @PreAuthorize("hasAuthority('products.view')")
    fun validateProductForChannel(
        @PathVariable productId: UUID,
        @PathVariable channelId: UUID
    ): ResponseEntity<Map<String, Any>> {
        val errors = channelService.validateProductForChannel(productId, channelId)
        val completeness = channelService.calculateCompleteness(productId, channelId)

        return ResponseEntity.ok(mapOf(
            "valid" to errors.isEmpty(),
            "completeness" to completeness,
            "errors" to errors
        ))
    }

    // ==================== STATISTICS ====================

    @GetMapping("/stats")
    @Operation(summary = "Get all channel statistics")
    @PreAuthorize("hasAuthority('settings.view')")
    fun getAllChannelStats(): ResponseEntity<List<ChannelStatsResponse>> {
        return ResponseEntity.ok(channelService.getAllChannelStats())
    }

    @GetMapping("/{channelId}/stats")
    @Operation(summary = "Get channel statistics")
    @PreAuthorize("hasAuthority('settings.view')")
    fun getChannelStats(@PathVariable channelId: UUID): ResponseEntity<ChannelStatsResponse> {
        return ResponseEntity.ok(channelService.getChannelStats(channelId))
    }
}
