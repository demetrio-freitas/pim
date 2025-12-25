package com.pim.infrastructure.web

import com.pim.application.AuditChange
import com.pim.application.AuditContext
import com.pim.application.AuditService
import com.pim.domain.audit.AuditAction
import com.pim.domain.audit.EntityType
import com.pim.domain.product.ProductStatus
import com.pim.domain.user.User
import com.pim.infrastructure.persistence.ProductRepository
import com.pim.infrastructure.persistence.UserRepository
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

data class BulkUpdateRequest(
    val productIds: List<UUID>,
    val updates: Map<String, Any?>
)

data class BulkDeleteRequest(
    val productIds: List<UUID>
)

data class BulkProductIdsRequest(
    val productIds: List<UUID>
)

data class BulkOperationResponse(
    val success: Int,
    val failed: Int,
    val errors: List<String> = emptyList()
)

data class DuplicateProductRequest(
    val copyImages: Boolean = true,
    val newSku: String? = null
)

@RestController
@RequestMapping("/api/products/bulk")
@Transactional
class BulkOperationsController(
    private val productRepository: ProductRepository,
    private val auditService: AuditService,
    private val userRepository: UserRepository
) {

    private fun getUser(userDetails: UserDetails): User? {
        return userRepository.findByEmail(userDetails.username)
    }

    @PostMapping("/update")
    @PreAuthorize("hasAuthority('products.write')")
    fun bulkUpdate(
        @RequestBody request: BulkUpdateRequest,
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<BulkOperationResponse> {
        val user = getUser(userDetails)
        val context = AuditContext(user = user)

        var success = 0
        var failed = 0
        val errors = mutableListOf<String>()

        request.productIds.forEach { productId ->
            try {
                val product = productRepository.findById(productId).orElse(null)
                if (product != null) {
                    val changes = mutableListOf<AuditChange>()

                    request.updates.forEach { (field, value) ->
                        val oldValue = when (field) {
                            "brand" -> product.brand
                            "manufacturer" -> product.manufacturer
                            "status" -> product.status.name
                            else -> null
                        }

                        when (field) {
                            "brand" -> product.brand = value as? String
                            "manufacturer" -> product.manufacturer = value as? String
                            "status" -> value?.let { product.status = ProductStatus.valueOf(it as String) }
                        }

                        if (oldValue != value) {
                            changes.add(AuditChange(field, oldValue, value))
                        }
                    }

                    product.updatedAt = Instant.now()
                    productRepository.save(product)

                    if (changes.isNotEmpty()) {
                        auditService.log(
                            entityType = EntityType.PRODUCT,
                            entityId = productId,
                            entityName = product.name,
                            action = AuditAction.BULK_UPDATE,
                            changes = changes,
                            context = context
                        )
                    }

                    success++
                } else {
                    failed++
                    errors.add("Product $productId not found")
                }
            } catch (e: Exception) {
                failed++
                errors.add("Error updating product $productId: ${e.message}")
            }
        }

        return ResponseEntity.ok(BulkOperationResponse(success, failed, errors))
    }

    @PostMapping("/delete")
    @PreAuthorize("hasAuthority('products.delete')")
    fun bulkDelete(
        @RequestBody request: BulkDeleteRequest,
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<BulkOperationResponse> {
        val user = getUser(userDetails)
        val context = AuditContext(user = user)

        var success = 0
        var failed = 0
        val errors = mutableListOf<String>()

        request.productIds.forEach { productId ->
            try {
                val product = productRepository.findById(productId).orElse(null)
                if (product != null) {
                    auditService.logDelete(EntityType.PRODUCT, productId, product.name, context)
                    productRepository.delete(product)
                    success++
                } else {
                    failed++
                    errors.add("Product $productId not found")
                }
            } catch (e: Exception) {
                failed++
                errors.add("Error deleting product $productId: ${e.message}")
            }
        }

        return ResponseEntity.ok(BulkOperationResponse(success, failed, errors))
    }

    @PostMapping("/publish")
    @PreAuthorize("hasAuthority('products.write')")
    fun bulkPublish(
        @RequestBody request: BulkProductIdsRequest,
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<BulkOperationResponse> {
        val user = getUser(userDetails)
        val context = AuditContext(user = user)

        var success = 0
        var failed = 0
        val errors = mutableListOf<String>()

        request.productIds.forEach { productId ->
            try {
                val product = productRepository.findById(productId).orElse(null)
                if (product != null) {
                    val oldStatus = product.status
                    product.status = ProductStatus.PUBLISHED
                    product.updatedAt = Instant.now()
                    productRepository.save(product)

                    auditService.log(
                        entityType = EntityType.PRODUCT,
                        entityId = productId,
                        entityName = product.name,
                        action = AuditAction.PUBLISH,
                        changes = listOf(AuditChange("status", oldStatus.name, ProductStatus.PUBLISHED.name)),
                        context = context
                    )

                    success++
                } else {
                    failed++
                    errors.add("Product $productId not found")
                }
            } catch (e: Exception) {
                failed++
                errors.add("Error publishing product $productId: ${e.message}")
            }
        }

        return ResponseEntity.ok(BulkOperationResponse(success, failed, errors))
    }

    @PostMapping("/unpublish")
    @PreAuthorize("hasAuthority('products.write')")
    fun bulkUnpublish(
        @RequestBody request: BulkProductIdsRequest,
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<BulkOperationResponse> {
        val user = getUser(userDetails)
        val context = AuditContext(user = user)

        var success = 0
        var failed = 0
        val errors = mutableListOf<String>()

        request.productIds.forEach { productId ->
            try {
                val product = productRepository.findById(productId).orElse(null)
                if (product != null) {
                    val oldStatus = product.status
                    product.status = ProductStatus.DRAFT
                    product.updatedAt = Instant.now()
                    productRepository.save(product)

                    auditService.log(
                        entityType = EntityType.PRODUCT,
                        entityId = productId,
                        entityName = product.name,
                        action = AuditAction.UNPUBLISH,
                        changes = listOf(AuditChange("status", oldStatus.name, ProductStatus.DRAFT.name)),
                        context = context
                    )

                    success++
                } else {
                    failed++
                    errors.add("Product $productId not found")
                }
            } catch (e: Exception) {
                failed++
                errors.add("Error unpublishing product $productId: ${e.message}")
            }
        }

        return ResponseEntity.ok(BulkOperationResponse(success, failed, errors))
    }
}

@RestController
@RequestMapping("/api/products/{productId}")
@Transactional
class ProductDuplicateController(
    private val productRepository: ProductRepository,
    private val auditService: AuditService,
    private val userRepository: UserRepository
) {

    private fun getUser(userDetails: UserDetails): User? {
        return userRepository.findByEmail(userDetails.username)
    }

    @PostMapping("/duplicate")
    @PreAuthorize("hasAuthority('products.write')")
    fun duplicateProduct(
        @PathVariable productId: UUID,
        @RequestBody(required = false) request: DuplicateProductRequest?,
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<Any> {
        val user = getUser(userDetails)
        val context = AuditContext(user = user)

        val original = productRepository.findById(productId)
            .orElseThrow { IllegalArgumentException("Product not found") }

        val newSku = request?.newSku ?: "${original.sku}-COPY-${System.currentTimeMillis()}"

        // Check if SKU already exists
        if (productRepository.existsBySku(newSku)) {
            return ResponseEntity.badRequest().body(mapOf("error" to "SKU already exists"))
        }

        val duplicate = original.copy(
            id = UUID.randomUUID(),
            sku = newSku,
            name = "${original.name} (Cópia)",
            status = ProductStatus.DRAFT,
            createdAt = Instant.now(),
            updatedAt = Instant.now(),
            media = if (request?.copyImages != false) original.media.toMutableList() else mutableListOf(),
            attributes = mutableListOf(), // Will need to copy these separately
            categories = original.categories.toMutableSet()
        )

        val saved = productRepository.save(duplicate)

        auditService.log(
            entityType = EntityType.PRODUCT,
            entityId = saved.id,
            entityName = saved.name,
            action = AuditAction.CREATE,
            metadata = mapOf("duplicatedFrom" to productId.toString()),
            context = context
        )

        return ResponseEntity.ok(saved)
    }
}
