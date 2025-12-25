package com.pim.infrastructure.web

import com.pim.application.CompletenessService
import com.pim.application.CompletenessRuleDTO
import com.pim.application.CompletenessEvaluation
import com.pim.domain.product.CompletenessRule
import com.pim.infrastructure.persistence.ProductRepository
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/completeness")
class CompletenessController(
    private val completenessService: CompletenessService,
    private val productRepository: ProductRepository
) {

    @GetMapping("/rules")
    @PreAuthorize("hasAnyAuthority('settings.read', 'products.read')")
    fun getRules(@RequestParam categoryId: UUID? = null): ResponseEntity<List<CompletenessRule>> {
        return ResponseEntity.ok(completenessService.getRules(categoryId))
    }

    @GetMapping("/rules/all")
    @PreAuthorize("hasAuthority('settings.write')")
    fun getAllRules(): ResponseEntity<List<CompletenessRule>> {
        return ResponseEntity.ok(completenessService.getAllRules())
    }

    @PostMapping("/rules")
    @PreAuthorize("hasAuthority('settings.write')")
    fun createRule(@RequestBody dto: CompletenessRuleDTO): ResponseEntity<CompletenessRule> {
        return ResponseEntity.ok(completenessService.createRule(dto))
    }

    @PutMapping("/rules/{id}")
    @PreAuthorize("hasAuthority('settings.write')")
    fun updateRule(
        @PathVariable id: UUID,
        @RequestBody dto: CompletenessRuleDTO
    ): ResponseEntity<CompletenessRule> {
        return ResponseEntity.ok(completenessService.updateRule(id, dto))
    }

    @DeleteMapping("/rules/{id}")
    @PreAuthorize("hasAuthority('settings.write')")
    fun deleteRule(@PathVariable id: UUID): ResponseEntity<Void> {
        completenessService.deleteRule(id)
        return ResponseEntity.noContent().build()
    }

    @GetMapping("/products/{productId}")
    @PreAuthorize("hasAuthority('products.read')")
    fun evaluateProduct(@PathVariable productId: UUID): ResponseEntity<CompletenessEvaluation> {
        val product = productRepository.findById(productId)
            .orElseThrow { IllegalArgumentException("Product not found") }
        return ResponseEntity.ok(completenessService.evaluateProduct(product))
    }

    @PostMapping("/initialize")
    @PreAuthorize("hasAuthority('settings.write')")
    fun initializeRules(): ResponseEntity<Map<String, String>> {
        completenessService.initializeDefaultRules()
        return ResponseEntity.ok(mapOf("message" to "Default rules initialized"))
    }
}
