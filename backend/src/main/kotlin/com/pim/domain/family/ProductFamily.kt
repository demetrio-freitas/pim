package com.pim.domain.family

import jakarta.persistence.*
import java.time.Instant
import java.util.*

/**
 * Família de Produto - Define a estrutura de atributos para um tipo de produto
 */
@Entity
@Table(name = "product_families")
data class ProductFamily(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(nullable = false, unique = true)
    var code: String,

    @Column(nullable = false)
    var name: String,

    var description: String? = null,

    // Imagem da família
    var imageUrl: String? = null,

    // Família ativa?
    var isActive: Boolean = true,

    // Número de produtos usando esta família
    @Column(name = "product_count")
    var productCount: Int = 0,

    // Metadados
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
 * Atributo associado a uma família
 */
@Entity
@Table(
    name = "family_attributes",
    uniqueConstraints = [UniqueConstraint(columnNames = ["family_id", "attribute_id"])]
)
data class FamilyAttribute(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(name = "family_id", nullable = false)
    val familyId: UUID,

    @Column(name = "attribute_id", nullable = false)
    val attributeId: UUID,

    // Obrigatório para esta família?
    var isRequired: Boolean = false,

    // Peso para cálculo de completude (0-100)
    var weight: Int = 10,

    // Posição para ordenação
    var position: Int = 0,

    // Grupo para organização visual
    var groupCode: String? = null,

    // Valor padrão
    var defaultValue: String? = null,

    // Regras de validação específicas para esta família (JSON)
    @Column(columnDefinition = "TEXT")
    var validationRules: String? = null,

    // Dicas/placeholder para o campo
    var placeholder: String? = null,
    var helpText: String? = null
)

/**
 * Requisitos de completude por canal para uma família
 */
@Entity
@Table(
    name = "family_channel_requirements",
    uniqueConstraints = [UniqueConstraint(columnNames = ["family_id", "channel_id"])]
)
data class FamilyChannelRequirement(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(name = "family_id", nullable = false)
    val familyId: UUID,

    @Column(name = "channel_id", nullable = false)
    val channelId: UUID,

    // Atributos obrigatórios adicionais para este canal
    @ElementCollection
    @CollectionTable(
        name = "family_channel_required_attrs",
        joinColumns = [JoinColumn(name = "requirement_id")]
    )
    @Column(name = "attribute_id")
    var requiredAttributeIds: MutableSet<UUID> = mutableSetOf(),

    // Score mínimo de completude para publicar neste canal
    var minCompletenessScore: Int = 80
)
