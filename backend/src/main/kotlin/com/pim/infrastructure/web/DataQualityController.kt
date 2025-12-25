package com.pim.infrastructure.web

import com.pim.application.*
import com.pim.domain.quality.*
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
data class CreateQualityRuleRequest(
    val code: String,
    val name: String,
    val description: String? = null,
    val type: QualityRuleType,
    val severity: RuleSeverity = RuleSeverity.ERROR,
    val attributeId: UUID? = null,
    val categoryId: UUID? = null,
    val familyId: UUID? = null,
    val channelId: UUID? = null,
    val parameters: Map<String, Any>? = null,
    val errorMessage: String? = null,
    val isActive: Boolean = true,
    val position: Int = 0
)

data class UpdateQualityRuleRequest(
    val code: String? = null,
    val name: String? = null,
    val description: String? = null,
    val type: QualityRuleType? = null,
    val severity: RuleSeverity? = null,
    val attributeId: UUID? = null,
    val categoryId: UUID? = null,
    val familyId: UUID? = null,
    val channelId: UUID? = null,
    val parameters: Map<String, Any>? = null,
    val errorMessage: String? = null,
    val isActive: Boolean? = null,
    val position: Int? = null
)

data class ValidateProductsRequest(
    val productIds: List<UUID>
)

@RestController
@RequestMapping("/api/quality")
@Tag(name = "Data Quality", description = "Data quality rules and validation")
class DataQualityController(
    private val qualityService: DataQualityService,
    private val userRepository: UserRepository
) {

    private fun getUser(userDetails: UserDetails): User? {
        return userRepository.findByEmail(userDetails.username)
    }

    // ==================== RULE CRUD ====================

    @GetMapping("/rules")
    @Operation(summary = "List all quality rules")
    @PreAuthorize("hasAuthority('settings.view')")
    fun listRules(): ResponseEntity<List<QualityRuleResponse>> {
        return ResponseEntity.ok(qualityService.getAllRules())
    }

    @GetMapping("/rules/active")
    @Operation(summary = "List active quality rules")
    @PreAuthorize("hasAuthority('products.view')")
    fun listActiveRules(): ResponseEntity<List<QualityRuleResponse>> {
        return ResponseEntity.ok(qualityService.getActiveRules())
    }

    @GetMapping("/rules/{id}")
    @Operation(summary = "Get quality rule by ID")
    @PreAuthorize("hasAuthority('settings.view')")
    fun getRule(@PathVariable id: UUID): ResponseEntity<QualityRuleResponse> {
        val rule = qualityService.getRule(id)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(rule)
    }

    @PostMapping("/rules")
    @Operation(summary = "Create a quality rule")
    @PreAuthorize("hasAuthority('settings.manage')")
    fun createRule(
        @RequestBody request: CreateQualityRuleRequest,
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<QualityRuleResponse> {
        val user = getUser(userDetails)
        val dto = QualityRuleDto(
            code = request.code,
            name = request.name,
            description = request.description,
            type = request.type,
            severity = request.severity,
            attributeId = request.attributeId,
            categoryId = request.categoryId,
            familyId = request.familyId,
            channelId = request.channelId,
            parameters = request.parameters,
            errorMessage = request.errorMessage,
            isActive = request.isActive,
            position = request.position
        )
        return ResponseEntity.ok(qualityService.createRule(dto, user?.id))
    }

    @PutMapping("/rules/{id}")
    @Operation(summary = "Update a quality rule")
    @PreAuthorize("hasAuthority('settings.manage')")
    fun updateRule(
        @PathVariable id: UUID,
        @RequestBody request: UpdateQualityRuleRequest
    ): ResponseEntity<QualityRuleResponse> {
        val existing = qualityService.getRule(id)
            ?: return ResponseEntity.notFound().build()

        val dto = QualityRuleDto(
            id = id,
            code = request.code ?: existing.code,
            name = request.name ?: existing.name,
            description = request.description ?: existing.description,
            type = request.type ?: existing.type,
            severity = request.severity ?: existing.severity,
            attributeId = request.attributeId ?: existing.attributeId,
            categoryId = request.categoryId ?: existing.categoryId,
            familyId = request.familyId ?: existing.familyId,
            channelId = request.channelId ?: existing.channelId,
            parameters = request.parameters ?: existing.parameters,
            errorMessage = request.errorMessage ?: existing.errorMessage,
            isActive = request.isActive ?: existing.isActive,
            position = request.position ?: existing.position
        )

        return ResponseEntity.ok(qualityService.updateRule(id, dto))
    }

    @DeleteMapping("/rules/{id}")
    @Operation(summary = "Delete a quality rule")
    @PreAuthorize("hasAuthority('settings.manage')")
    fun deleteRule(@PathVariable id: UUID): ResponseEntity<Void> {
        qualityService.deleteRule(id)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/rules/{id}/toggle")
    @Operation(summary = "Toggle rule active status")
    @PreAuthorize("hasAuthority('settings.manage')")
    fun toggleRule(@PathVariable id: UUID): ResponseEntity<QualityRuleResponse> {
        return ResponseEntity.ok(qualityService.toggleRule(id))
    }

    // ==================== RULE TYPES ====================

    @GetMapping("/rule-types")
    @Operation(summary = "Get available rule types")
    fun getRuleTypes(): ResponseEntity<List<Map<String, String>>> {
        val types = QualityRuleType.entries.map {
            mapOf(
                "value" to it.name,
                "label" to when (it) {
                    QualityRuleType.REQUIRED -> "Campo Obrigatório"
                    QualityRuleType.MIN_LENGTH -> "Comprimento Mínimo"
                    QualityRuleType.MAX_LENGTH -> "Comprimento Máximo"
                    QualityRuleType.REGEX -> "Expressão Regular"
                    QualityRuleType.RANGE -> "Intervalo Numérico"
                    QualityRuleType.ENUM -> "Lista de Valores"
                    QualityRuleType.UNIQUE -> "Valor Único"
                    QualityRuleType.FORMAT -> "Formato Específico"
                    QualityRuleType.RELATIONSHIP -> "Relação entre Campos"
                    QualityRuleType.CUSTOM -> "Regra Customizada"
                }
            )
        }
        return ResponseEntity.ok(types)
    }

    @GetMapping("/severities")
    @Operation(summary = "Get available severities")
    fun getSeverities(): ResponseEntity<List<Map<String, String>>> {
        val severities = RuleSeverity.entries.map {
            mapOf(
                "value" to it.name,
                "label" to when (it) {
                    RuleSeverity.ERROR -> "Erro (Bloqueia)"
                    RuleSeverity.WARNING -> "Aviso"
                    RuleSeverity.INFO -> "Informativo"
                }
            )
        }
        return ResponseEntity.ok(severities)
    }

    // ==================== VALIDATION ====================

    @GetMapping("/validate/product/{productId}")
    @Operation(summary = "Validate a single product")
    @PreAuthorize("hasAuthority('products.view')")
    fun validateProduct(@PathVariable productId: UUID): ResponseEntity<ProductQualityReport> {
        return ResponseEntity.ok(qualityService.validateProduct(productId))
    }

    @PostMapping("/validate/products")
    @Operation(summary = "Validate multiple products")
    @PreAuthorize("hasAuthority('products.view')")
    fun validateProducts(@RequestBody request: ValidateProductsRequest): ResponseEntity<List<ProductQualityReport>> {
        return ResponseEntity.ok(qualityService.validateProducts(request.productIds))
    }

    @GetMapping("/validate/all")
    @Operation(summary = "Validate all products (paginated)")
    @PreAuthorize("hasAuthority('products.view')")
    fun validateAllProducts(
        @PageableDefault(size = 20) pageable: Pageable
    ): ResponseEntity<Page<ProductQualityReport>> {
        return ResponseEntity.ok(qualityService.validateAllProducts(pageable))
    }

    // ==================== HISTORY & STATS ====================

    @GetMapping("/history/product/{productId}")
    @Operation(summary = "Get validation history for a product")
    @PreAuthorize("hasAuthority('products.view')")
    fun getProductHistory(
        @PathVariable productId: UUID,
        @PageableDefault(size = 10) pageable: Pageable
    ): ResponseEntity<Page<QualityValidationLog>> {
        return ResponseEntity.ok(qualityService.getProductValidationHistory(productId, pageable))
    }

    @GetMapping("/dashboard")
    @Operation(summary = "Get quality dashboard stats")
    @PreAuthorize("hasAuthority('products.view')")
    fun getDashboardStats(): ResponseEntity<QualityDashboardStats> {
        return ResponseEntity.ok(qualityService.getDashboardStats())
    }
}
