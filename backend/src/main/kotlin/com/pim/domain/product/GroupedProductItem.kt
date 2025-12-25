package com.pim.domain.product

import jakarta.persistence.*
import java.time.Instant
import java.util.*

/**
 * Item de um produto Agrupado
 * Cada item representa um produto que pode ser comprado junto
 * Cliente escolhe quantidade de cada item individualmente
 */
@Entity
@Table(
    name = "grouped_product_items",
    uniqueConstraints = [UniqueConstraint(columnNames = ["parent_id", "child_id"])]
)
data class GroupedProductItem(
    @Id
    val id: UUID = UUID.randomUUID(),

    // Produto pai (agrupado)
    @Column(name = "parent_id", nullable = false)
    val parentId: UUID,

    // Produto filho
    @Column(name = "child_id", nullable = false)
    val childId: UUID,

    // Quantidade padrão sugerida
    @Column(name = "default_quantity", nullable = false)
    var defaultQuantity: Int = 1,

    // Quantidade mínima que pode ser comprada
    @Column(name = "min_quantity", nullable = false)
    var minQuantity: Int = 0,

    // Quantidade máxima que pode ser comprada (null = sem limite)
    @Column(name = "max_quantity")
    var maxQuantity: Int? = null,

    // Posição para ordenação
    var position: Int = 0,

    val createdAt: Instant = Instant.now()
)
