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
@RequestMapping("/api/amazon")
@Tag(name = "Amazon Integration", description = "Amazon Seller Central account management and sync operations")
class AmazonController(
    private val amazonService: AmazonService,
    private val userRepository: UserRepository
) {
    private fun getUser(userDetails: UserDetails): User? {
        return userRepository.findByEmail(userDetails.username)
    }

    // ==================== Account Management ====================

    @PostMapping("/accounts")
    @Operation(summary = "Create a new Amazon Seller account connection")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun createAccount(
        @RequestBody request: AmazonAccountCreateRequest,
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<AmazonAccountResponse> {
        val user = getUser(userDetails)
        val created = amazonService.createAccount(request, user?.id)
        return ResponseEntity.status(HttpStatus.CREATED).body(created)
    }

    @GetMapping("/accounts")
    @Operation(summary = "List all Amazon Seller accounts")
    @PreAuthorize("hasAuthority('settings.view')")
    fun listAccounts(
        @PageableDefault(size = 20) pageable: Pageable
    ): ResponseEntity<Page<AmazonAccountResponse>> {
        return ResponseEntity.ok(amazonService.getAllAccounts(pageable))
    }

    @GetMapping("/accounts/{id}")
    @Operation(summary = "Get Amazon account by ID")
    @PreAuthorize("hasAuthority('settings.view')")
    fun getAccountById(@PathVariable id: UUID): ResponseEntity<AmazonAccountResponse> {
        val account = amazonService.getAccountById(id)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(account)
    }

    @PutMapping("/accounts/{id}")
    @Operation(summary = "Update Amazon account")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun updateAccount(
        @PathVariable id: UUID,
        @RequestBody request: AmazonAccountUpdateRequest
    ): ResponseEntity<AmazonAccountResponse> {
        val updated = amazonService.updateAccount(id, request)
        return ResponseEntity.ok(updated)
    }

    @DeleteMapping("/accounts/{id}")
    @Operation(summary = "Delete Amazon account connection")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun deleteAccount(@PathVariable id: UUID): ResponseEntity<Void> {
        amazonService.deleteAccount(id)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/accounts/{id}/test")
    @Operation(summary = "Test Amazon account connection")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun testConnection(@PathVariable id: UUID): ResponseEntity<Map<String, Any>> {
        val result = amazonService.testConnection(id)
        return ResponseEntity.ok(result)
    }

    @GetMapping("/accounts/{id}/stats")
    @Operation(summary = "Get Amazon account statistics")
    @PreAuthorize("hasAuthority('settings.view')")
    fun getAccountStats(@PathVariable id: UUID): ResponseEntity<AmazonAccountStatsResponse> {
        val stats = amazonService.getAccountStats(id)
        return ResponseEntity.ok(stats)
    }

    // ==================== Sync Operations ====================

    @PostMapping("/accounts/{id}/sync")
    @Operation(summary = "Sync products to Amazon")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun syncProducts(
        @PathVariable id: UUID,
        @RequestBody(required = false) request: AmazonSyncRequest?,
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<AmazonSyncResultResponse> {
        val user = getUser(userDetails)
        val result = amazonService.syncProducts(
            id,
            request ?: AmazonSyncRequest(),
            user?.id
        )
        return ResponseEntity.ok(result)
    }

    @PostMapping("/accounts/{id}/sync/products/{productId}")
    @Operation(summary = "Sync a single product to Amazon")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun syncSingleProduct(
        @PathVariable id: UUID,
        @PathVariable productId: UUID,
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<AmazonSyncResultResponse> {
        val user = getUser(userDetails)
        val result = amazonService.syncProducts(
            id,
            AmazonSyncRequest(productIds = listOf(productId)),
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
    ): ResponseEntity<Page<AmazonProductMappingResponse>> {
        return ResponseEntity.ok(amazonService.getMappings(id, pageable))
    }

    @GetMapping("/accounts/{accountId}/mappings/products/{productId}")
    @Operation(summary = "Get mapping for a specific product")
    @PreAuthorize("hasAuthority('settings.view')")
    fun getProductMapping(
        @PathVariable accountId: UUID,
        @PathVariable productId: UUID
    ): ResponseEntity<AmazonProductMappingResponse> {
        val mapping = amazonService.getMappingByProductId(accountId, productId)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(mapping)
    }

    @DeleteMapping("/accounts/{accountId}/mappings/products/{productId}")
    @Operation(summary = "Unlink a product from Amazon")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun unlinkProduct(
        @PathVariable accountId: UUID,
        @PathVariable productId: UUID
    ): ResponseEntity<Void> {
        amazonService.unlinkProduct(accountId, productId)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/accounts/{accountId}/mappings/products/{productId}/deactivate")
    @Operation(summary = "Deactivate a product listing in Amazon")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun deactivateProduct(
        @PathVariable accountId: UUID,
        @PathVariable productId: UUID
    ): ResponseEntity<Void> {
        amazonService.deactivateProductInAmazon(accountId, productId)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/accounts/{accountId}/mappings/products/{productId}/reactivate")
    @Operation(summary = "Reactivate a product listing in Amazon")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun reactivateProduct(
        @PathVariable accountId: UUID,
        @PathVariable productId: UUID
    ): ResponseEntity<Void> {
        amazonService.reactivateProductInAmazon(accountId, productId)
        return ResponseEntity.noContent().build()
    }

    // ==================== Marketplaces ====================

    @GetMapping("/marketplaces")
    @Operation(summary = "Get available Amazon marketplaces")
    @PreAuthorize("hasAuthority('settings.view')")
    fun getMarketplaces(): ResponseEntity<List<AmazonMarketplaceResponse>> {
        return ResponseEntity.ok(amazonService.getMarketplaces())
    }
}
