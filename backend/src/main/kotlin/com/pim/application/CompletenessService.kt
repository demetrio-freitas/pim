package com.pim.application

import com.pim.domain.product.CompletenessRule
import com.pim.domain.product.DefaultCompletenessRules
import com.pim.domain.product.Product
import com.pim.infrastructure.persistence.CompletenessRuleRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

data class CompletenessEvaluation(
    val score: Int,
    val rules: List<RuleEvaluation>
)

data class RuleEvaluation(
    val field: String,
    val label: String,
    val required: Boolean,
    val filled: Boolean,
    val weight: Int
)

data class CompletenessRuleDTO(
    val id: UUID?,
    val field: String,
    val label: String,
    val isRequired: Boolean,
    val weight: Int,
    val isActive: Boolean,
    val categoryId: UUID?
)

@Service
@Transactional
class CompletenessService(
    private val completenessRuleRepository: CompletenessRuleRepository
) {

    fun initializeDefaultRules() {
        val existingRules = completenessRuleRepository.findByCategoryIdIsNullAndIsActiveTrue()
        if (existingRules.isEmpty()) {
            val defaultRules = DefaultCompletenessRules.getDefaultRules()
            completenessRuleRepository.saveAll(defaultRules)
        }
    }

    fun getRules(categoryId: UUID? = null): List<CompletenessRule> {
        return if (categoryId != null) {
            completenessRuleRepository.findRulesForCategory(categoryId)
        } else {
            completenessRuleRepository.findByCategoryIdIsNullAndIsActiveTrue()
        }
    }

    fun getAllRules(): List<CompletenessRule> {
        return completenessRuleRepository.findAll()
    }

    fun createRule(dto: CompletenessRuleDTO): CompletenessRule {
        val rule = CompletenessRule(
            field = dto.field,
            label = dto.label,
            isRequired = dto.isRequired,
            weight = dto.weight,
            isActive = dto.isActive,
            categoryId = dto.categoryId
        )
        return completenessRuleRepository.save(rule)
    }

    fun updateRule(id: UUID, dto: CompletenessRuleDTO): CompletenessRule {
        val rule = completenessRuleRepository.findById(id)
            .orElseThrow { IllegalArgumentException("Rule not found") }

        val updatedRule = rule.copy(
            label = dto.label,
            isRequired = dto.isRequired,
            weight = dto.weight,
            isActive = dto.isActive,
            updatedAt = Instant.now()
        )

        return completenessRuleRepository.save(updatedRule)
    }

    fun deleteRule(id: UUID) {
        completenessRuleRepository.deleteById(id)
    }

    fun evaluateProduct(product: Product): CompletenessEvaluation {
        val categoryId = product.categories.firstOrNull()?.id
        val rules = getRules(categoryId)

        if (rules.isEmpty()) {
            return CompletenessEvaluation(score = 100, rules = emptyList())
        }

        val evaluations = rules.map { rule ->
            val filled = isFieldFilled(product, rule.field)
            RuleEvaluation(
                field = rule.field,
                label = rule.label,
                required = rule.isRequired,
                filled = filled,
                weight = rule.weight
            )
        }

        val totalWeight = evaluations.sumOf { it.weight }
        val filledWeight = evaluations.filter { it.filled }.sumOf { it.weight }

        val score = if (totalWeight > 0) {
            ((filledWeight.toDouble() / totalWeight) * 100).toInt()
        } else {
            100
        }

        return CompletenessEvaluation(score = score, rules = evaluations)
    }

    private fun isFieldFilled(product: Product, field: String): Boolean {
        return when (field) {
            "name" -> !product.name.isNullOrBlank()
            "description" -> !product.description.isNullOrBlank()
            "shortDescription" -> !product.shortDescription.isNullOrBlank()
            "price" -> product.price != null && product.price!! > java.math.BigDecimal.ZERO
            "images" -> product.media.isNotEmpty()
            "category" -> product.categories.isNotEmpty()
            "brand" -> !product.brand.isNullOrBlank()
            "manufacturer" -> !product.manufacturer.isNullOrBlank()
            "weight" -> product.weight != null && product.weight!! > java.math.BigDecimal.ZERO
            "metaTitle" -> !product.metaTitle.isNullOrBlank()
            "metaDescription" -> !product.metaDescription.isNullOrBlank()
            "metaKeywords" -> !product.metaKeywords.isNullOrBlank()
            "urlKey" -> !product.urlKey.isNullOrBlank()
            else -> {
                // Check in attributes
                val attribute = product.attributes.find { it.attribute.code == field }
                attribute?.let {
                    !it.textValue.isNullOrBlank() ||
                    it.numberValue != null ||
                    it.booleanValue != null ||
                    !it.jsonValue.isNullOrBlank()
                } ?: false
            }
        }
    }

    fun calculateScore(product: Product): Int {
        return evaluateProduct(product).score
    }
}
