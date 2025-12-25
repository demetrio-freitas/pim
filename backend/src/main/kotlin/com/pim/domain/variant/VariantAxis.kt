package com.pim.domain.variant

import jakarta.persistence.*
import java.time.Instant
import java.util.*

/**
 * Eixo de variação para produtos configuráveis
 * Ex: Cor, Tamanho, Voltagem
 */
@Entity
@Table(name = "variant_axes")
data class VariantAxis(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(nullable = false, unique = true)
    var code: String,

    @Column(nullable = false)
    var name: String,

    var description: String? = null,

    // Atributo associado (ex: color_attribute) - opcional
    @Column(name = "attribute_id")
    var attributeId: UUID? = null,

    // Posição para ordenação
    var position: Int = 0,

    // Ativo?
    var isActive: Boolean = true,

    val createdAt: Instant = Instant.now(),
    var updatedAt: Instant = Instant.now()
) {
    @PreUpdate
    fun onUpdate() {
        updatedAt = Instant.now()
    }
}

/**
 * Configuração de variantes para um produto pai (configurable)
 */
@Entity
@Table(name = "product_variant_configs")
data class ProductVariantConfig(
    @Id
    val id: UUID = UUID.randomUUID(),

    // Produto pai (configurable)
    @Column(name = "product_id", nullable = false, unique = true)
    val productId: UUID,

    // Eixos de variação usados
    @ElementCollection
    @CollectionTable(name = "product_variant_axes", joinColumns = [JoinColumn(name = "config_id")])
    @Column(name = "axis_id")
    var axisIds: MutableSet<UUID> = mutableSetOf(),

    // Gerar SKUs automaticamente?
    var autoGenerateSku: Boolean = true,

    // Padrão de SKU (ex: {parent_sku}-{color}-{size})
    var skuPattern: String? = null,

    val createdAt: Instant = Instant.now(),
    var updatedAt: Instant = Instant.now()
) {
    @PreUpdate
    fun onUpdate() {
        updatedAt = Instant.now()
    }
}

/**
 * Valores específicos de uma variante
 */
@Entity
@Table(
    name = "variant_attribute_values",
    uniqueConstraints = [UniqueConstraint(columnNames = ["variant_id", "axis_id"])]
)
data class VariantAttributeValue(
    @Id
    val id: UUID = UUID.randomUUID(),

    // Produto variante
    @Column(name = "variant_id", nullable = false)
    val variantId: UUID,

    // Eixo de variação
    @Column(name = "axis_id", nullable = false)
    val axisId: UUID,

    // Valor do eixo (ex: "azul", "M")
    @Column(nullable = false)
    var value: String,

    // Label para exibição
    var label: String? = null,

    // Código hexadecimal (para cores)
    var colorCode: String? = null,

    // Imagem (para swatches)
    var imageUrl: String? = null,

    var position: Int = 0
)
