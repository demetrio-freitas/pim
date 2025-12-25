package com.pim.domain.product

import jakarta.persistence.*
import java.time.Instant
import java.util.*

/**
 * Componente de um produto Bundle (Kit)
 * Cada componente representa um produto que faz parte do bundle com sua quantidade
 */
@Entity
@Table(
    name = "bundle_components",
    uniqueConstraints = [UniqueConstraint(columnNames = ["bundle_id", "component_id"])]
)
data class BundleComponent(
    @Id
    val id: UUID = UUID.randomUUID(),

    // Produto bundle (pai)
    @Column(name = "bundle_id", nullable = false)
    val bundleId: UUID,

    // Produto componente
    @Column(name = "component_id", nullable = false)
    val componentId: UUID,

    // Quantidade deste componente no bundle
    @Column(nullable = false)
    var quantity: Int = 1,

    // Posição para ordenação
    var position: Int = 0,

    // Preço especial do componente no bundle (opcional, se null usa preço original)
    @Column(name = "special_price", precision = 19, scale = 4)
    var specialPrice: java.math.BigDecimal? = null,

    val createdAt: Instant = Instant.now()
)
