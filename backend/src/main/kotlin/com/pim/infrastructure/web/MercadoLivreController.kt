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
@RequestMapping("/api/mercadolivre")
@Tag(name = "Mercado Livre Integration", description = "Mercado Livre account management and sync operations")
class MercadoLivreController(
    private val mercadoLivreService: MercadoLivreService,
    private val userRepository: UserRepository
) {
    private fun getUser(userDetails: UserDetails): User? {
        return userRepository.findByEmail(userDetails.username)
    }

    // ==================== Account Management ====================

    @PostMapping("/accounts")
    @Operation(summary = "Create a new Mercado Livre account connection")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun createAccount(
        @RequestBody request: MLAccountCreateRequest,
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<MLAccountResponse> {
        val user = getUser(userDetails)
        val created = mercadoLivreService.createAccount(request, user?.id)
        return ResponseEntity.status(HttpStatus.CREATED).body(created)
    }

    @GetMapping("/accounts")
    @Operation(summary = "List all Mercado Livre accounts")
    @PreAuthorize("hasAuthority('settings.view')")
    fun listAccounts(
        @PageableDefault(size = 20) pageable: Pageable
    ): ResponseEntity<Page<MLAccountResponse>> {
        return ResponseEntity.ok(mercadoLivreService.getAllAccounts(pageable))
    }

    @GetMapping("/accounts/{id}")
    @Operation(summary = "Get Mercado Livre account by ID")
    @PreAuthorize("hasAuthority('settings.view')")
    fun getAccountById(@PathVariable id: UUID): ResponseEntity<MLAccountResponse> {
        val account = mercadoLivreService.getAccountById(id)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(account)
    }

    @PutMapping("/accounts/{id}")
    @Operation(summary = "Update Mercado Livre account")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun updateAccount(
        @PathVariable id: UUID,
        @RequestBody request: MLAccountUpdateRequest
    ): ResponseEntity<MLAccountResponse> {
        val updated = mercadoLivreService.updateAccount(id, request)
        return ResponseEntity.ok(updated)
    }

    @DeleteMapping("/accounts/{id}")
    @Operation(summary = "Delete Mercado Livre account connection")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun deleteAccount(@PathVariable id: UUID): ResponseEntity<Void> {
        mercadoLivreService.deleteAccount(id)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/accounts/{id}/test")
    @Operation(summary = "Test Mercado Livre account connection")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun testConnection(@PathVariable id: UUID): ResponseEntity<Map<String, Any>> {
        val result = mercadoLivreService.testConnection(id)
        return ResponseEntity.ok(result)
    }

    // ==================== Sync Operations ====================

    @PostMapping("/accounts/{id}/sync")
    @Operation(summary = "Sync products to Mercado Livre")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun syncProducts(
        @PathVariable id: UUID,
        @RequestBody(required = false) request: MLSyncRequest?,
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<MLSyncResultResponse> {
        val user = getUser(userDetails)
        val result = mercadoLivreService.syncProducts(
            id,
            request ?: MLSyncRequest(),
            user?.id
        )
        return ResponseEntity.ok(result)
    }

    @PostMapping("/accounts/{id}/sync/products/{productId}")
    @Operation(summary = "Sync a single product to Mercado Livre")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun syncSingleProduct(
        @PathVariable id: UUID,
        @PathVariable productId: UUID,
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<MLSyncResultResponse> {
        val user = getUser(userDetails)
        val result = mercadoLivreService.syncProducts(
            id,
            MLSyncRequest(productIds = listOf(productId)),
            user?.id
        )
        return ResponseEntity.ok(result)
    }

    // ==================== Product Mappings ====================

    @GetMapping("/accounts/{id}/mappings")
    @Operation(summary = "Get product mappings for an account")
    @PreAuthorize("hasAuthority('settings.view')")
    fun getProductMappings(
        @PathVariable id: UUID,
        @PageableDefault(size = 50) pageable: Pageable
    ): ResponseEntity<Page<MLProductMappingResponse>> {
        return ResponseEntity.ok(mercadoLivreService.getMappings(id, pageable))
    }

    @GetMapping("/accounts/{accountId}/mappings/products/{productId}")
    @Operation(summary = "Get mapping for a specific product")
    @PreAuthorize("hasAuthority('settings.view')")
    fun getProductMapping(
        @PathVariable accountId: UUID,
        @PathVariable productId: UUID
    ): ResponseEntity<MLProductMappingResponse> {
        val mapping = mercadoLivreService.getMappingByProductId(accountId, productId)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(mapping)
    }

    @DeleteMapping("/accounts/{accountId}/mappings/products/{productId}")
    @Operation(summary = "Unlink a product from Mercado Livre")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun unlinkProduct(
        @PathVariable accountId: UUID,
        @PathVariable productId: UUID
    ): ResponseEntity<Void> {
        mercadoLivreService.unlinkProduct(accountId, productId)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/accounts/{accountId}/mappings/products/{productId}/pause")
    @Operation(summary = "Pause a product in Mercado Livre")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun pauseProduct(
        @PathVariable accountId: UUID,
        @PathVariable productId: UUID
    ): ResponseEntity<Void> {
        mercadoLivreService.pauseProductInML(accountId, productId)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/accounts/{accountId}/mappings/products/{productId}/reactivate")
    @Operation(summary = "Reactivate a product in Mercado Livre")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun reactivateProduct(
        @PathVariable accountId: UUID,
        @PathVariable productId: UUID
    ): ResponseEntity<Void> {
        mercadoLivreService.reactivateProductInML(accountId, productId)
        return ResponseEntity.noContent().build()
    }

    // ==================== Categories ====================

    @GetMapping("/categories")
    @Operation(summary = "Get Mercado Livre categories")
    @PreAuthorize("hasAuthority('settings.view')")
    fun getCategories(
        @RequestParam(defaultValue = "MLB") siteId: String
    ): ResponseEntity<List<MLCategoryResponse>> {
        return ResponseEntity.ok(mercadoLivreService.getCategories(siteId))
    }

    @GetMapping("/categories/{categoryId}/attributes")
    @Operation(summary = "Get attributes for a category")
    @PreAuthorize("hasAuthority('settings.view')")
    fun getCategoryAttributes(
        @PathVariable categoryId: String
    ): ResponseEntity<List<MLAttributeResponse>> {
        return ResponseEntity.ok(mercadoLivreService.getCategoryAttributes(categoryId))
    }
}
