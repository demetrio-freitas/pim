package com.pim.domain.product

import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "completeness_rules")
data class CompletenessRule(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID = UUID.randomUUID(),

    @Column(nullable = false)
    val field: String,

    @Column(nullable = false)
    val label: String,

    @Column(nullable = false)
    val isRequired: Boolean = false,

    @Column(nullable = false)
    val weight: Int = 10,

    @Column(nullable = false)
    var isActive: Boolean = true,

    @Column
    val categoryId: UUID? = null, // null = applies to all products

    @Column(nullable = false)
    val createdAt: Instant = Instant.now(),

    @Column(nullable = false)
    var updatedAt: Instant = Instant.now()
)

// Default rules to be initialized
object DefaultCompletenessRules {
    fun getDefaultRules(): List<CompletenessRule> = listOf(
        CompletenessRule(field = "name", label = "Nome", isRequired = true, weight = 15),
        CompletenessRule(field = "description", label = "Descrição", isRequired = true, weight = 15),
        CompletenessRule(field = "shortDescription", label = "Descrição Curta", isRequired = false, weight = 5),
        CompletenessRule(field = "price", label = "Preço", isRequired = true, weight = 15),
        CompletenessRule(field = "images", label = "Imagens", isRequired = true, weight = 20),
        CompletenessRule(field = "category", label = "Categoria", isRequired = true, weight = 10),
        CompletenessRule(field = "brand", label = "Marca", isRequired = false, weight = 5),
        CompletenessRule(field = "weight", label = "Peso", isRequired = false, weight = 5),
        CompletenessRule(field = "metaTitle", label = "Meta Título (SEO)", isRequired = false, weight = 5),
        CompletenessRule(field = "metaDescription", label = "Meta Descrição (SEO)", isRequired = false, weight = 5)
    )
}
