package com.pim.infrastructure.web

import com.pim.application.*
import com.pim.domain.user.User
import com.pim.infrastructure.persistence.UserRepository
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PageableDefault
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.web.bind.annotation.*
import java.util.*

@RestController
@RequestMapping("/api/shopify")
@Tag(name = "Shopify Integration", description = "Shopify store management and sync operations")
class ShopifyController(
    private val shopifyService: ShopifyService,
    private val userRepository: UserRepository
) {
    private fun getUser(userDetails: UserDetails): User? {
        return userRepository.findByEmail(userDetails.username)
    }

    // ==================== Store Management ====================

    @PostMapping("/stores")
    @Operation(summary = "Create a new Shopify store connection")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun createStore(
        @RequestBody request: ShopifyStoreCreateRequest,
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<ShopifyStoreResponse> {
        val user = getUser(userDetails)
        val created = shopifyService.createStore(request, user?.id)
        return ResponseEntity.status(HttpStatus.CREATED).body(created)
    }

    @GetMapping("/stores")
    @Operation(summary = "List all Shopify stores")
    @PreAuthorize("hasAuthority('settings.view')")
    fun listStores(
        @PageableDefault(size = 20) pageable: Pageable
    ): ResponseEntity<Page<ShopifyStoreResponse>> {
        return ResponseEntity.ok(shopifyService.getAllStores(pageable))
    }

    @GetMapping("/stores/{id}")
    @Operation(summary = "Get Shopify store by ID")
    @PreAuthorize("hasAuthority('settings.view')")
    fun getStoreById(@PathVariable id: UUID): ResponseEntity<ShopifyStoreResponse> {
        val store = shopifyService.getStoreById(id)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(store)
    }

    @PutMapping("/stores/{id}")
    @Operation(summary = "Update Shopify store")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun updateStore(
        @PathVariable id: UUID,
        @RequestBody request: ShopifyStoreUpdateRequest
    ): ResponseEntity<ShopifyStoreResponse> {
        val updated = shopifyService.updateStore(id, request)
        return ResponseEntity.ok(updated)
    }

    @DeleteMapping("/stores/{id}")
    @Operation(summary = "Delete Shopify store connection")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun deleteStore(@PathVariable id: UUID): ResponseEntity<Void> {
        shopifyService.deleteStore(id)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/stores/{id}/test")
    @Operation(summary = "Test Shopify store connection")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun testConnection(@PathVariable id: UUID): ResponseEntity<Map<String, Any>> {
        val result = shopifyService.testConnection(id)
        return ResponseEntity.ok(result)
    }

    // ==================== Sync Operations ====================

    @PostMapping("/stores/{id}/sync")
    @Operation(summary = "Sync products to Shopify")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun syncProducts(
        @PathVariable id: UUID,
        @RequestBody(required = false) request: SyncProductRequest?,
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<SyncResultResponse> {
        val user = getUser(userDetails)
        val result = shopifyService.syncProductsToShopify(
            id,
            request ?: SyncProductRequest(),
            user?.id
        )
        return ResponseEntity.ok(result)
    }

    @PostMapping("/stores/{id}/sync/products/{productId}")
    @Operation(summary = "Sync a single product to Shopify")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun syncSingleProduct(
        @PathVariable id: UUID,
        @PathVariable productId: UUID,
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<SyncResultResponse> {
        val user = getUser(userDetails)
        val result = shopifyService.syncProductsToShopify(
            id,
            SyncProductRequest(productIds = listOf(productId)),
            user?.id
        )
        return ResponseEntity.ok(result)
    }

    // ==================== Sync Logs ====================

    @GetMapping("/stores/{id}/logs")
    @Operation(summary = "Get sync logs for a store")
    @PreAuthorize("hasAuthority('settings.view')")
    fun getSyncLogs(
        @PathVariable id: UUID,
        @PageableDefault(size = 50) pageable: Pageable
    ): ResponseEntity<Page<ShopifySyncLogResponse>> {
        return ResponseEntity.ok(shopifyService.getSyncLogs(id, pageable))
    }

    // ==================== Product Mappings ====================

    @GetMapping("/stores/{id}/mappings")
    @Operation(summary = "Get product mappings for a store")
    @PreAuthorize("hasAuthority('settings.view')")
    fun getProductMappings(
        @PathVariable id: UUID,
        @PageableDefault(size = 50) pageable: Pageable
    ): ResponseEntity<Page<ShopifyProductMappingResponse>> {
        return ResponseEntity.ok(shopifyService.getProductMappings(id, pageable))
    }

    @DeleteMapping("/stores/{storeId}/mappings/products/{productId}")
    @Operation(summary = "Unlink a product from Shopify")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun unlinkProduct(
        @PathVariable storeId: UUID,
        @PathVariable productId: UUID
    ): ResponseEntity<Void> {
        shopifyService.unlinkProduct(storeId, productId)
        return ResponseEntity.noContent().build()
    }
}
