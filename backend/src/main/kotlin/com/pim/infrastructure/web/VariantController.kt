package com.pim.infrastructure.web

import com.pim.application.*
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*
import java.util.*

// Request DTOs
data class CreateVariantAxisRequest(
    val code: String,
    val name: String,
    val description: String? = null,
    val attributeId: UUID? = null,
    val position: Int = 0,
    val isActive: Boolean = true
)

data class UpdateVariantAxisRequest(
    val code: String? = null,
    val name: String? = null,
    val description: String? = null,
    val attributeId: UUID? = null,
    val position: Int? = null,
    val isActive: Boolean? = null
)

data class ConfigureVariantsRequest(
    val axisIds: List<UUID>,
    val skuPattern: String? = null
)

data class CreateVariantPayload(
    val sku: String? = null,
    val name: String? = null,
    val axisValues: Map<UUID, String>,
    val price: java.math.BigDecimal? = null,
    val stockQuantity: Int? = null
)

data class BulkCreateVariantsRequest(
    val combinations: List<Map<UUID, String>>
)

@RestController
@RequestMapping("/api/variants")
@Tag(name = "Variants", description = "Product variant management")
class VariantController(
    private val variantService: VariantService
) {

    // ==================== VARIANT AXES ====================

    @GetMapping("/axes")
    @Operation(summary = "List all variant axes")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('products.view')")
    fun listAxes(): ResponseEntity<List<VariantAxisResponse>> {
        return ResponseEntity.ok(variantService.getAllAxes())
    }

    @GetMapping("/axes/active")
    @Operation(summary = "List active variant axes")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('products.view')")
    fun listActiveAxes(): ResponseEntity<List<VariantAxisResponse>> {
        return ResponseEntity.ok(variantService.getActiveAxes())
    }

    @GetMapping("/axes/{id}")
    @Operation(summary = "Get variant axis by ID")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('products.view')")
    fun getAxis(@PathVariable id: UUID): ResponseEntity<VariantAxisResponse> {
        val axis = variantService.getAxis(id)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(axis)
    }

    @PostMapping("/axes")
    @Operation(summary = "Create a variant axis")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('settings.manage')")
    fun createAxis(@RequestBody request: CreateVariantAxisRequest): ResponseEntity<VariantAxisResponse> {
        val dto = VariantAxisDto(
            code = request.code,
            name = request.name,
            description = request.description,
            attributeId = request.attributeId,
            position = request.position,
            isActive = request.isActive
        )
        return ResponseEntity.ok(variantService.createAxis(dto))
    }

    @PutMapping("/axes/{id}")
    @Operation(summary = "Update a variant axis")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('settings.manage')")
    fun updateAxis(
        @PathVariable id: UUID,
        @RequestBody request: UpdateVariantAxisRequest
    ): ResponseEntity<VariantAxisResponse> {
        val existing = variantService.getAxis(id)
            ?: return ResponseEntity.notFound().build()

        val dto = VariantAxisDto(
            id = id,
            code = request.code ?: existing.code,
            name = request.name ?: existing.name,
            description = request.description ?: existing.description,
            attributeId = request.attributeId ?: existing.attributeId,
            position = request.position ?: existing.position,
            isActive = request.isActive ?: existing.isActive
        )

        return ResponseEntity.ok(variantService.updateAxis(id, dto))
    }

    @DeleteMapping("/axes/{id}")
    @Operation(summary = "Delete a variant axis")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('settings.manage')")
    fun deleteAxis(@PathVariable id: UUID): ResponseEntity<Void> {
        variantService.deleteAxis(id)
        return ResponseEntity.noContent().build()
    }

    // ==================== PRODUCT VARIANT CONFIG ====================

    @GetMapping("/product/{productId}")
    @Operation(summary = "Get variant configuration for a product")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('products.view')")
    fun getVariantConfig(@PathVariable productId: UUID): ResponseEntity<VariantConfigResponse> {
        val config = variantService.getVariantConfig(productId)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(config)
    }

    @PostMapping("/product/{productId}/configure")
    @Operation(summary = "Configure variant axes for a product")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('products.update')")
    fun configureVariants(
        @PathVariable productId: UUID,
        @RequestBody request: ConfigureVariantsRequest
    ): ResponseEntity<VariantConfigResponse> {
        return ResponseEntity.ok(
            variantService.configureVariants(productId, request.axisIds, request.skuPattern)
        )
    }

    // ==================== VARIANTS ====================

    @GetMapping("/product/{productId}/variants")
    @Operation(summary = "List variants for a product")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('products.view')")
    fun listVariants(@PathVariable productId: UUID): ResponseEntity<List<VariantResponse>> {
        return ResponseEntity.ok(variantService.getVariants(productId))
    }

    @PostMapping("/product/{productId}/variants")
    @Operation(summary = "Create a variant")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('products.create')")
    fun createVariant(
        @PathVariable productId: UUID,
        @RequestBody request: CreateVariantPayload
    ): ResponseEntity<VariantResponse> {
        val createRequest = CreateVariantRequest(
            sku = request.sku,
            name = request.name,
            axisValues = request.axisValues,
            price = request.price,
            stockQuantity = request.stockQuantity
        )
        return ResponseEntity.ok(variantService.createVariant(productId, createRequest))
    }

    @PutMapping("/variant/{variantId}")
    @Operation(summary = "Update a variant")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('products.update')")
    fun updateVariant(
        @PathVariable variantId: UUID,
        @RequestBody request: CreateVariantPayload
    ): ResponseEntity<VariantResponse> {
        val updateRequest = CreateVariantRequest(
            sku = request.sku,
            name = request.name,
            axisValues = request.axisValues,
            price = request.price,
            stockQuantity = request.stockQuantity
        )
        return ResponseEntity.ok(variantService.updateVariant(variantId, updateRequest))
    }

    @DeleteMapping("/variant/{variantId}")
    @Operation(summary = "Delete a variant")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('products.delete')")
    fun deleteVariant(@PathVariable variantId: UUID): ResponseEntity<Void> {
        variantService.deleteVariant(variantId)
        return ResponseEntity.noContent().build()
    }

    // ==================== VARIANT MATRIX ====================

    @GetMapping("/product/{productId}/matrix")
    @Operation(summary = "Get variant matrix (all possible combinations)")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('products.view')")
    fun getVariantMatrix(@PathVariable productId: UUID): ResponseEntity<List<VariantMatrixEntry>> {
        return ResponseEntity.ok(variantService.getVariantMatrix(productId))
    }

    @PostMapping("/product/{productId}/bulk-create")
    @Operation(summary = "Bulk create variants from combinations")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('products.create')")
    fun bulkCreateVariants(
        @PathVariable productId: UUID,
        @RequestBody request: BulkCreateVariantsRequest
    ): ResponseEntity<List<VariantResponse>> {
        return ResponseEntity.ok(variantService.bulkCreateVariants(productId, request.combinations))
    }
}
