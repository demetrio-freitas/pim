package com.pim.domain.quality

import jakarta.persistence.*
import java.time.Instant
import java.util.*

/**
 * Tipo de regra de qualidade
 */
enum class QualityRuleType {
    REQUIRED,           // Campo obrigatório
    MIN_LENGTH,         // Comprimento mínimo de texto
    MAX_LENGTH,         // Comprimento máximo de texto
    REGEX,              // Padrão regex
    RANGE,              // Valor numérico em range
    ENUM,               // Valor deve estar em lista
    UNIQUE,             // Valor único
    FORMAT,             // Formato específico (email, url, etc)
    RELATIONSHIP,       // Relação com outro campo
    CUSTOM              // Regra customizada (script)
}

/**
 * Severidade da regra
 */
enum class RuleSeverity {
    ERROR,      // Bloqueia publicação
    WARNING,    // Alerta, mas permite continuar
    INFO        // Apenas informativo
}

/**
 * Regra de qualidade de dados
 */
@Entity
@Table(name = "data_quality_rules")
data class DataQualityRule(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(nullable = false, unique = true)
    var code: String,

    @Column(nullable = false)
    var name: String,

    var description: String? = null,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var type: QualityRuleType,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var severity: RuleSeverity = RuleSeverity.ERROR,

    // Atributo alvo (null = aplica ao produto em geral)
    @Column(name = "attribute_id")
    var attributeId: UUID? = null,

    // Categoria específica (null = todas)
    @Column(name = "category_id")
    var categoryId: UUID? = null,

    // Família específica (null = todas)
    @Column(name = "family_id")
    var familyId: UUID? = null,

    // Canal específico (null = todos)
    @Column(name = "channel_id")
    var channelId: UUID? = null,

    // Parâmetros da regra (JSON)
    @Column(columnDefinition = "TEXT")
    var parameters: String? = null,

    // Mensagem de erro customizada
    var errorMessage: String? = null,

    // Ativo?
    var isActive: Boolean = true,

    // Posição para ordem de execução
    var position: Int = 0,

    val createdAt: Instant = Instant.now(),
    var updatedAt: Instant = Instant.now(),
    var createdBy: UUID? = null
) {
    @PreUpdate
    fun onUpdate() {
        updatedAt = Instant.now()
    }
}

/**
 * Resultado da validação de uma regra
 */
data class QualityValidationResult(
    val ruleId: UUID,
    val ruleCode: String,
    val ruleName: String,
    val passed: Boolean,
    val severity: RuleSeverity,
    val message: String?,
    val attributeCode: String?,
    val currentValue: Any?
)

/**
 * Relatório de qualidade de um produto
 */
data class ProductQualityReport(
    val productId: UUID,
    val productSku: String,
    val productName: String,
    val overallScore: Int,
    val errorCount: Int,
    val warningCount: Int,
    val infoCount: Int,
    val results: List<QualityValidationResult>,
    val suggestions: List<QualitySuggestion>,
    val evaluatedAt: Instant
)

/**
 * Sugestão de melhoria de qualidade
 */
data class QualitySuggestion(
    val type: String, // FILL_ATTRIBUTE, IMPROVE_DESCRIPTION, ADD_IMAGE, etc
    val priority: Int, // 1-5
    val message: String,
    val attributeCode: String?,
    val impactScore: Int // quanto vai melhorar o score se corrigir
)

/**
 * Log de execução de regras de qualidade
 */
@Entity
@Table(name = "quality_validation_logs")
data class QualityValidationLog(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(name = "product_id", nullable = false)
    val productId: UUID,

    val overallScore: Int,
    val errorCount: Int,
    val warningCount: Int,

    // Detalhes em JSON
    @Column(columnDefinition = "TEXT")
    var details: String? = null,

    val createdAt: Instant = Instant.now()
)
