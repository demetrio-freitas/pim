package com.pim.infrastructure.web

import com.pim.application.*
import com.pim.domain.product.ProductType
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*
import java.math.BigDecimal
import java.util.*

// Request DTOs
data class ConvertTypeRequest(
    val targetType: ProductType
)

data class AddBundleComponentRequest(
    val componentId: UUID,
    val quantity: Int = 1,
    val position: Int = 0,
    val specialPrice: BigDecimal? = null
)

data class UpdateBundleComponentRequest(
    val quantity: Int? = null,
    val position: Int? = null,
    val specialPrice: BigDecimal? = null
)

data class SetBundleComponentsRequest(
    val components: List<AddBundleComponentRequest>
)

data class AddGroupedItemRequest(
    val childId: UUID,
    val defaultQuantity: Int = 1,
    val minQuantity: Int = 0,
    val maxQuantity: Int? = null,
    val position: Int = 0
)

data class UpdateGroupedItemRequest(
    val defaultQuantity: Int? = null,
    val minQuantity: Int? = null,
    val maxQuantity: Int? = null,
    val position: Int? = null
)

data class SetGroupedItemsRequest(
    val items: List<AddGroupedItemRequest>
)

data class StockOperationRequest(
    val quantity: Int
)

@RestController
@RequestMapping("/api/products")
@Tag(name = "Product Types", description = "Product type management - bundles, grouped products, and type conversion")
class ProductTypeController(
    private val productTypeService: ProductTypeService
) {

    // ==================== TYPE INFO & CONVERSION ====================

    @GetMapping("/{productId}/type-info")
    @Operation(summary = "Get product type information with related data")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('products.view')")
    fun getProductTypeInfo(@PathVariable productId: UUID): ResponseEntity<ProductTypeInfo> {
        return ResponseEntity.ok(productTypeService.getProductTypeInfo(productId))
    }

    @PostMapping("/{productId}/convert-type")
    @Operation(summary = "Convert product to a different type")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('products.update')")
    fun convertProductType(
        @PathVariable productId: UUID,
        @RequestBody request: ConvertTypeRequest
    ): ResponseEntity<ProductTypeInfo> {
        productTypeService.convertProductType(productId, request.targetType)
        return ResponseEntity.ok(productTypeService.getProductTypeInfo(productId))
    }

    // ==================== BUNDLE COMPONENTS ====================

    @GetMapping("/{bundleId}/bundle-components")
    @Operation(summary = "Get bundle components")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('products.view')")
    fun getBundleComponents(@PathVariable bundleId: UUID): ResponseEntity<List<BundleComponentResponse>> {
        return ResponseEntity.ok(productTypeService.getBundleComponents(bundleId))
    }

    @PostMapping("/{bundleId}/bundle-components")
    @Operation(summary = "Add a component to bundle")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('products.update')")
    fun addBundleComponent(
        @PathVariable bundleId: UUID,
        @RequestBody request: AddBundleComponentRequest
    ): ResponseEntity<BundleComponentResponse> {
        val dto = BundleComponentDto(
            componentId = request.componentId,
            quantity = request.quantity,
            position = request.position,
            specialPrice = request.specialPrice
        )
        return ResponseEntity.ok(productTypeService.addBundleComponent(bundleId, dto))
    }

    @PutMapping("/bundle-components/{componentId}")
    @Operation(summary = "Update a bundle component")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('products.update')")
    fun updateBundleComponent(
        @PathVariable componentId: UUID,
        @RequestBody request: UpdateBundleComponentRequest
    ): ResponseEntity<BundleComponentResponse> {
        // We need to get the existing component first to maintain unchanged values
        val dto = BundleComponentDto(
            componentId = UUID.randomUUID(), // Will be ignored in update
            quantity = request.quantity ?: 1,
            position = request.position ?: 0,
            specialPrice = request.specialPrice
        )
        return ResponseEntity.ok(productTypeService.updateBundleComponent(componentId, dto))
    }

    @DeleteMapping("/bundle-components/{componentId}")
    @Operation(summary = "Remove a component from bundle")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('products.update')")
    fun removeBundleComponent(@PathVariable componentId: UUID): ResponseEntity<Void> {
        productTypeService.removeBundleComponent(componentId)
        return ResponseEntity.noContent().build()
    }

    @PutMapping("/{bundleId}/bundle-components")
    @Operation(summary = "Set all bundle components (replace existing)")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('products.update')")
    fun setBundleComponents(
        @PathVariable bundleId: UUID,
        @RequestBody request: SetBundleComponentsRequest
    ): ResponseEntity<List<BundleComponentResponse>> {
        val dtos = request.components.map { comp ->
            BundleComponentDto(
                componentId = comp.componentId,
                quantity = comp.quantity,
                position = comp.position,
                specialPrice = comp.specialPrice
            )
        }
        return ResponseEntity.ok(productTypeService.setBundleComponents(bundleId, dtos))
    }

    // ==================== GROUPED ITEMS ====================

    @GetMapping("/{parentId}/grouped-items")
    @Operation(summary = "Get grouped product items")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('products.view')")
    fun getGroupedItems(@PathVariable parentId: UUID): ResponseEntity<List<GroupedProductItemResponse>> {
        return ResponseEntity.ok(productTypeService.getGroupedItems(parentId))
    }

    @PostMapping("/{parentId}/grouped-items")
    @Operation(summary = "Add a product to grouped product")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('products.update')")
    fun addGroupedItem(
        @PathVariable parentId: UUID,
        @RequestBody request: AddGroupedItemRequest
    ): ResponseEntity<GroupedProductItemResponse> {
        val dto = GroupedProductItemDto(
            childId = request.childId,
            defaultQuantity = request.defaultQuantity,
            minQuantity = request.minQuantity,
            maxQuantity = request.maxQuantity,
            position = request.position
        )
        return ResponseEntity.ok(productTypeService.addGroupedItem(parentId, dto))
    }

    @PutMapping("/grouped-items/{itemId}")
    @Operation(summary = "Update a grouped item")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('products.update')")
    fun updateGroupedItem(
        @PathVariable itemId: UUID,
        @RequestBody request: UpdateGroupedItemRequest
    ): ResponseEntity<GroupedProductItemResponse> {
        val dto = GroupedProductItemDto(
            childId = UUID.randomUUID(), // Will be ignored in update
            defaultQuantity = request.defaultQuantity ?: 1,
            minQuantity = request.minQuantity ?: 0,
            maxQuantity = request.maxQuantity,
            position = request.position ?: 0
        )
        return ResponseEntity.ok(productTypeService.updateGroupedItem(itemId, dto))
    }

    @DeleteMapping("/grouped-items/{itemId}")
    @Operation(summary = "Remove an item from grouped product")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('products.update')")
    fun removeGroupedItem(@PathVariable itemId: UUID): ResponseEntity<Void> {
        productTypeService.removeGroupedItem(itemId)
        return ResponseEntity.noContent().build()
    }

    @PutMapping("/{parentId}/grouped-items")
    @Operation(summary = "Set all grouped items (replace existing)")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('products.update')")
    fun setGroupedItems(
        @PathVariable parentId: UUID,
        @RequestBody request: SetGroupedItemsRequest
    ): ResponseEntity<List<GroupedProductItemResponse>> {
        val dtos = request.items.map { item ->
            GroupedProductItemDto(
                childId = item.childId,
                defaultQuantity = item.defaultQuantity,
                minQuantity = item.minQuantity,
                maxQuantity = item.maxQuantity,
                position = item.position
            )
        }
        return ResponseEntity.ok(productTypeService.setGroupedItems(parentId, dtos))
    }

    // ==================== STOCK OPERATIONS ====================

    @GetMapping("/{productId}/stock/validate")
    @Operation(summary = "Validate stock operation")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('products.view')")
    fun validateStock(
        @PathVariable productId: UUID,
        @RequestParam quantity: Int
    ): ResponseEntity<StockValidationResult> {
        return ResponseEntity.ok(productTypeService.validateStockOperation(productId, quantity))
    }

    @PostMapping("/{productId}/stock/decrement")
    @Operation(summary = "Decrement stock (handles bundles automatically)")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('products.update')")
    fun decrementStock(
        @PathVariable productId: UUID,
        @RequestBody request: StockOperationRequest
    ): ResponseEntity<StockDecrementResult> {
        return ResponseEntity.ok(productTypeService.decrementStock(productId, request.quantity))
    }

    @GetMapping("/{bundleId}/bundle-price")
    @Operation(summary = "Calculate bundle total price")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('products.view')")
    fun getBundlePrice(@PathVariable bundleId: UUID): ResponseEntity<Map<String, Any>> {
        val price = productTypeService.calculateBundlePrice(bundleId)
        return ResponseEntity.ok(mapOf("bundleId" to bundleId, "totalPrice" to price))
    }

    @GetMapping("/{productId}/usage")
    @Operation(summary = "Get where product is used (bundles, grouped products)")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('products.view')")
    fun getProductUsage(@PathVariable productId: UUID): ResponseEntity<Map<String, List<UUID>>> {
        return ResponseEntity.ok(productTypeService.getProductUsage(productId))
    }
}
