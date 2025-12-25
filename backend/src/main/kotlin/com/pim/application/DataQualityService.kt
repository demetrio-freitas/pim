package com.pim.application

import com.fasterxml.jackson.databind.ObjectMapper
import com.pim.domain.product.Product
import com.pim.domain.quality.*
import com.pim.infrastructure.persistence.*
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.*

// DTOs
data class QualityRuleDto(
    val id: UUID? = null,
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

data class QualityRuleResponse(
    val id: UUID,
    val code: String,
    val name: String,
    val description: String?,
    val type: QualityRuleType,
    val severity: RuleSeverity,
    val attributeId: UUID?,
    val attributeCode: String?,
    val attributeName: String?,
    val categoryId: UUID?,
    val familyId: UUID?,
    val channelId: UUID?,
    val parameters: Map<String, Any>?,
    val errorMessage: String?,
    val isActive: Boolean,
    val position: Int,
    val createdAt: Instant,
    val updatedAt: Instant
)

data class QualityDashboardStats(
    val averageScore: Int,
    val productsWithErrors: Int,
    val productsWithWarnings: Int,
    val totalRulesActive: Int,
    val rulesBreakdown: Map<RuleSeverity, Int>,
    val topIssues: List<TopIssue>
)

data class TopIssue(
    val ruleCode: String,
    val ruleName: String,
    val severity: RuleSeverity,
    val occurrences: Int
)

@Service
class DataQualityService(
    private val ruleRepository: DataQualityRuleRepository,
    private val validationLogRepository: QualityValidationLogRepository,
    private val productRepository: ProductRepository,
    private val attributeRepository: AttributeRepository,
    private val objectMapper: ObjectMapper
) {

    // ==================== RULE CRUD ====================

    fun getAllRules(): List<QualityRuleResponse> {
        return ruleRepository.findAllByOrderByPositionAsc().map { toRuleResponse(it) }
    }

    fun getActiveRules(): List<QualityRuleResponse> {
        return ruleRepository.findByIsActiveOrderByPositionAsc(true).map { toRuleResponse(it) }
    }

    fun getRule(id: UUID): QualityRuleResponse? {
        return ruleRepository.findById(id).orElse(null)?.let { toRuleResponse(it) }
    }

    @Transactional
    fun createRule(dto: QualityRuleDto, userId: UUID? = null): QualityRuleResponse {
        if (ruleRepository.existsByCode(dto.code)) {
            throw IllegalArgumentException("Regra com código '${dto.code}' já existe")
        }

        val rule = DataQualityRule(
            code = dto.code,
            name = dto.name,
            description = dto.description,
            type = dto.type,
            severity = dto.severity,
            attributeId = dto.attributeId,
            categoryId = dto.categoryId,
            familyId = dto.familyId,
            channelId = dto.channelId,
            parameters = dto.parameters?.let { objectMapper.writeValueAsString(it) },
            errorMessage = dto.errorMessage,
            isActive = dto.isActive,
            position = dto.position,
            createdBy = userId
        )

        return toRuleResponse(ruleRepository.save(rule))
    }

    @Transactional
    fun updateRule(id: UUID, dto: QualityRuleDto): QualityRuleResponse {
        val rule = ruleRepository.findById(id).orElseThrow {
            IllegalArgumentException("Regra não encontrada")
        }

        if (dto.code != rule.code && ruleRepository.existsByCode(dto.code)) {
            throw IllegalArgumentException("Regra com código '${dto.code}' já existe")
        }

        rule.apply {
            code = dto.code
            name = dto.name
            description = dto.description
            type = dto.type
            severity = dto.severity
            attributeId = dto.attributeId
            categoryId = dto.categoryId
            familyId = dto.familyId
            channelId = dto.channelId
            parameters = dto.parameters?.let { objectMapper.writeValueAsString(it) }
            errorMessage = dto.errorMessage
            isActive = dto.isActive
            position = dto.position
        }

        return toRuleResponse(ruleRepository.save(rule))
    }

    @Transactional
    fun deleteRule(id: UUID) {
        ruleRepository.deleteById(id)
    }

    @Transactional
    fun toggleRule(id: UUID): QualityRuleResponse {
        val rule = ruleRepository.findById(id).orElseThrow {
            IllegalArgumentException("Regra não encontrada")
        }
        rule.isActive = !rule.isActive
        return toRuleResponse(ruleRepository.save(rule))
    }

    // ==================== VALIDATION ====================

    fun validateProduct(productId: UUID): ProductQualityReport {
        val product = productRepository.findById(productId).orElseThrow {
            IllegalArgumentException("Produto não encontrado")
        }

        // Get applicable rules
        val categoryId = product.categories.firstOrNull()?.id
        val rules = ruleRepository.findApplicableRules(categoryId, null)

        val results = mutableListOf<QualityValidationResult>()

        for (rule in rules) {
            val result = evaluateRule(product, rule)
            results.add(result)
        }

        val errorCount = results.count { !it.passed && it.severity == RuleSeverity.ERROR }
        val warningCount = results.count { !it.passed && it.severity == RuleSeverity.WARNING }
        val infoCount = results.count { !it.passed && it.severity == RuleSeverity.INFO }

        val passedCount = results.count { it.passed }
        val overallScore = if (results.isNotEmpty()) (passedCount * 100) / results.size else 100

        val suggestions = generateSuggestions(product, results)

        val report = ProductQualityReport(
            productId = product.id,
            productSku = product.sku,
            productName = product.name,
            overallScore = overallScore,
            errorCount = errorCount,
            warningCount = warningCount,
            infoCount = infoCount,
            results = results,
            suggestions = suggestions,
            evaluatedAt = Instant.now()
        )

        // Log validation
        logValidation(product.id, report)

        return report
    }

    fun validateProducts(productIds: List<UUID>): List<ProductQualityReport> {
        return productIds.mapNotNull { productId ->
            try {
                validateProduct(productId)
            } catch (e: Exception) {
                null
            }
        }
    }

    fun validateAllProducts(pageable: Pageable): Page<ProductQualityReport> {
        return productRepository.findAll(pageable).map { product ->
            validateProduct(product.id)
        }
    }

    // ==================== RULE EVALUATION ====================

    private fun evaluateRule(product: Product, rule: DataQualityRule): QualityValidationResult {
        val attributeCode = rule.attributeId?.let { attrId ->
            attributeRepository.findById(attrId).orElse(null)?.code
        }

        val value = if (rule.attributeId != null) {
            product.attributes.find { it.attribute.id == rule.attributeId }?.getValue()
        } else null

        val passed = when (rule.type) {
            QualityRuleType.REQUIRED -> evaluateRequired(product, rule)
            QualityRuleType.MIN_LENGTH -> evaluateMinLength(value, rule)
            QualityRuleType.MAX_LENGTH -> evaluateMaxLength(value, rule)
            QualityRuleType.REGEX -> evaluateRegex(value, rule)
            QualityRuleType.RANGE -> evaluateRange(value, rule)
            QualityRuleType.ENUM -> evaluateEnum(value, rule)
            QualityRuleType.UNIQUE -> evaluateUnique(product, rule, value)
            QualityRuleType.FORMAT -> evaluateFormat(value, rule)
            QualityRuleType.RELATIONSHIP -> evaluateRelationship(product, rule)
            QualityRuleType.CUSTOM -> evaluateCustom(product, rule)
        }

        val message = if (!passed) {
            rule.errorMessage ?: getDefaultErrorMessage(rule)
        } else null

        return QualityValidationResult(
            ruleId = rule.id,
            ruleCode = rule.code,
            ruleName = rule.name,
            passed = passed,
            severity = rule.severity,
            message = message,
            attributeCode = attributeCode,
            currentValue = value
        )
    }

    private fun evaluateRequired(product: Product, rule: DataQualityRule): Boolean {
        if (rule.attributeId != null) {
            val attr = product.attributes.find { it.attribute.id == rule.attributeId }
            val value = attr?.getValue()
            return value != null && value.toString().isNotBlank()
        }

        // Check basic product fields
        val params = parseParams(rule.parameters)
        val field = params["field"] as? String ?: return true

        return when (field) {
            "name" -> product.name.isNotBlank()
            "sku" -> product.sku.isNotBlank()
            "description" -> !product.description.isNullOrBlank()
            "price" -> product.price != null && product.price!! > java.math.BigDecimal.ZERO
            "categories" -> product.categories.isNotEmpty()
            "media" -> product.media.isNotEmpty()
            else -> true
        }
    }

    private fun evaluateMinLength(value: Any?, rule: DataQualityRule): Boolean {
        if (value == null) return true // Not required by this rule
        val params = parseParams(rule.parameters)
        val minLength = (params["minLength"] as? Number)?.toInt() ?: return true
        return value.toString().length >= minLength
    }

    private fun evaluateMaxLength(value: Any?, rule: DataQualityRule): Boolean {
        if (value == null) return true
        val params = parseParams(rule.parameters)
        val maxLength = (params["maxLength"] as? Number)?.toInt() ?: return true
        return value.toString().length <= maxLength
    }

    private fun evaluateRegex(value: Any?, rule: DataQualityRule): Boolean {
        if (value == null) return true
        val params = parseParams(rule.parameters)
        val pattern = params["pattern"] as? String ?: return true
        return try {
            Regex(pattern).matches(value.toString())
        } catch (e: Exception) {
            true
        }
    }

    private fun evaluateRange(value: Any?, rule: DataQualityRule): Boolean {
        if (value == null) return true
        val params = parseParams(rule.parameters)
        val min = (params["min"] as? Number)?.toDouble()
        val max = (params["max"] as? Number)?.toDouble()
        val numValue = (value as? Number)?.toDouble() ?: value.toString().toDoubleOrNull() ?: return true

        if (min != null && numValue < min) return false
        if (max != null && numValue > max) return false
        return true
    }

    private fun evaluateEnum(value: Any?, rule: DataQualityRule): Boolean {
        if (value == null) return true
        val params = parseParams(rule.parameters)
        @Suppress("UNCHECKED_CAST")
        val allowedValues = (params["values"] as? List<String>) ?: return true
        return value.toString() in allowedValues
    }

    private fun evaluateUnique(product: Product, rule: DataQualityRule, value: Any?): Boolean {
        if (value == null) return true
        // For basic implementation, just check if value is not empty
        // Full uniqueness check would require DB query
        return true
    }

    private fun evaluateFormat(value: Any?, rule: DataQualityRule): Boolean {
        if (value == null) return true
        val params = parseParams(rule.parameters)
        val format = params["format"] as? String ?: return true

        return when (format) {
            "email" -> value.toString().matches(Regex("^[A-Za-z0-9+_.-]+@(.+)\$"))
            "url" -> value.toString().matches(Regex("^https?://.*"))
            "phone" -> value.toString().matches(Regex("^[+]?[0-9\\s()-]+\$"))
            "ean" -> value.toString().matches(Regex("^\\d{8,14}\$"))
            else -> true
        }
    }

    private fun evaluateRelationship(product: Product, rule: DataQualityRule): Boolean {
        // Relationship rules between fields
        val params = parseParams(rule.parameters)
        val sourceField = params["source"] as? String ?: return true
        val targetField = params["target"] as? String ?: return true
        val condition = params["condition"] as? String ?: return true

        // Example: if price exists, currency must exist
        // Simplified implementation
        return true
    }

    private fun evaluateCustom(product: Product, rule: DataQualityRule): Boolean {
        // Custom script evaluation
        // For now, just return true
        return true
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseParams(json: String?): Map<String, Any> {
        if (json.isNullOrBlank()) return emptyMap()
        return try {
            objectMapper.readValue(json, Map::class.java) as Map<String, Any>
        } catch (e: Exception) {
            emptyMap()
        }
    }

    private fun getDefaultErrorMessage(rule: DataQualityRule): String {
        return when (rule.type) {
            QualityRuleType.REQUIRED -> "Campo obrigatório não preenchido"
            QualityRuleType.MIN_LENGTH -> "Texto muito curto"
            QualityRuleType.MAX_LENGTH -> "Texto muito longo"
            QualityRuleType.REGEX -> "Formato inválido"
            QualityRuleType.RANGE -> "Valor fora do intervalo permitido"
            QualityRuleType.ENUM -> "Valor não está na lista permitida"
            QualityRuleType.UNIQUE -> "Valor já existe em outro produto"
            QualityRuleType.FORMAT -> "Formato inválido"
            QualityRuleType.RELATIONSHIP -> "Relação entre campos inválida"
            QualityRuleType.CUSTOM -> "Validação customizada falhou"
        }
    }

    // ==================== SUGGESTIONS ====================

    private fun generateSuggestions(product: Product, results: List<QualityValidationResult>): List<QualitySuggestion> {
        val suggestions = mutableListOf<QualitySuggestion>()

        // Suggest filling missing required fields
        val failedRequired = results.filter { !it.passed && it.severity == RuleSeverity.ERROR }
        for (result in failedRequired) {
            suggestions.add(
                QualitySuggestion(
                    type = "FILL_ATTRIBUTE",
                    priority = 5,
                    message = "Preencha o campo '${result.attributeCode ?: "obrigatório"}' para melhorar a qualidade",
                    attributeCode = result.attributeCode,
                    impactScore = 10
                )
            )
        }

        // Suggest adding images
        if (product.media.isEmpty()) {
            suggestions.add(
                QualitySuggestion(
                    type = "ADD_IMAGE",
                    priority = 4,
                    message = "Adicione imagens ao produto para melhorar a apresentação",
                    attributeCode = null,
                    impactScore = 15
                )
            )
        }

        // Suggest improving description
        if (product.description.isNullOrBlank() || product.description!!.length < 100) {
            suggestions.add(
                QualitySuggestion(
                    type = "IMPROVE_DESCRIPTION",
                    priority = 3,
                    message = "Adicione uma descrição mais detalhada (mínimo 100 caracteres)",
                    attributeCode = null,
                    impactScore = 10
                )
            )
        }

        // Suggest adding categories
        if (product.categories.isEmpty()) {
            suggestions.add(
                QualitySuggestion(
                    type = "ADD_CATEGORY",
                    priority = 4,
                    message = "Associe o produto a pelo menos uma categoria",
                    attributeCode = null,
                    impactScore = 10
                )
            )
        }

        return suggestions.sortedByDescending { it.priority }
    }

    // ==================== LOGGING & STATS ====================

    private fun logValidation(productId: UUID, report: ProductQualityReport) {
        val log = QualityValidationLog(
            productId = productId,
            overallScore = report.overallScore,
            errorCount = report.errorCount,
            warningCount = report.warningCount,
            details = objectMapper.writeValueAsString(report.results.filter { !it.passed })
        )
        validationLogRepository.save(log)
    }

    fun getProductValidationHistory(productId: UUID, pageable: Pageable): Page<QualityValidationLog> {
        return validationLogRepository.findByProductIdOrderByCreatedAtDesc(productId, pageable)
    }

    fun getDashboardStats(): QualityDashboardStats {
        val since = Instant.now().minus(30, ChronoUnit.DAYS)

        val avgScore = validationLogRepository.getAverageScore(since)?.toInt() ?: 0
        val recentLogs = validationLogRepository.findRecentLogs(since, PageRequest.of(0, 1000))

        val productsWithErrors = recentLogs.content.count { it.errorCount > 0 }
        val productsWithWarnings = recentLogs.content.count { it.warningCount > 0 && it.errorCount == 0 }

        val activeRules = ruleRepository.findByIsActiveOrderByPositionAsc(true)
        val rulesBreakdown = activeRules.groupBy { it.severity }.mapValues { it.value.size }

        // For top issues, would need to aggregate from logs
        // Simplified for now
        val topIssues = emptyList<TopIssue>()

        return QualityDashboardStats(
            averageScore = avgScore,
            productsWithErrors = productsWithErrors,
            productsWithWarnings = productsWithWarnings,
            totalRulesActive = activeRules.size,
            rulesBreakdown = rulesBreakdown,
            topIssues = topIssues
        )
    }

    // ==================== HELPERS ====================

    private fun toRuleResponse(rule: DataQualityRule): QualityRuleResponse {
        val attribute = rule.attributeId?.let { attributeRepository.findById(it).orElse(null) }

        val parameters: Map<String, Any>? = rule.parameters?.let {
            try {
                @Suppress("UNCHECKED_CAST")
                objectMapper.readValue(it, Map::class.java) as Map<String, Any>
            } catch (e: Exception) {
                null
            }
        }

        return QualityRuleResponse(
            id = rule.id,
            code = rule.code,
            name = rule.name,
            description = rule.description,
            type = rule.type,
            severity = rule.severity,
            attributeId = rule.attributeId,
            attributeCode = attribute?.code,
            attributeName = attribute?.name,
            categoryId = rule.categoryId,
            familyId = rule.familyId,
            channelId = rule.channelId,
            parameters = parameters,
            errorMessage = rule.errorMessage,
            isActive = rule.isActive,
            position = rule.position,
            createdAt = rule.createdAt,
            updatedAt = rule.updatedAt
        )
    }
}
