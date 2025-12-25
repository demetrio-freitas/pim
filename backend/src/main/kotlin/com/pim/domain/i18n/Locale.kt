package com.pim.domain.i18n

import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "locales")
data class Locale(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID = UUID.randomUUID(),

    @Column(nullable = false, unique = true, length = 10)
    val code: String, // e.g., "pt-BR", "en-US", "es-ES"

    @Column(nullable = false)
    val name: String, // e.g., "Português (Brasil)"

    @Column(nullable = false)
    var isActive: Boolean = true,

    @Column(nullable = false)
    var isDefault: Boolean = false,

    @Column
    val flagIcon: String? = null, // e.g., "🇧🇷" or icon path

    @Column(nullable = false)
    val createdAt: Instant = Instant.now()
)

@Entity
@Table(
    name = "product_translations",
    uniqueConstraints = [UniqueConstraint(columnNames = ["product_id", "locale_id"])]
)
data class ProductTranslation(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID = UUID.randomUUID(),

    @Column(name = "product_id", nullable = false)
    val productId: UUID,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "locale_id", nullable = false)
    val locale: Locale,

    @Column
    var name: String? = null,

    @Column(columnDefinition = "TEXT")
    var description: String? = null,

    @Column(columnDefinition = "TEXT")
    var shortDescription: String? = null,

    @Column
    var metaTitle: String? = null,

    @Column(columnDefinition = "TEXT")
    var metaDescription: String? = null,

    @Column
    var metaKeywords: String? = null,

    @Column
    var urlKey: String? = null,

    @Column(nullable = false)
    val createdAt: Instant = Instant.now(),

    @Column(nullable = false)
    var updatedAt: Instant = Instant.now()
)

@Entity
@Table(
    name = "category_translations",
    uniqueConstraints = [UniqueConstraint(columnNames = ["category_id", "locale_id"])]
)
data class CategoryTranslation(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID = UUID.randomUUID(),

    @Column(name = "category_id", nullable = false)
    val categoryId: UUID,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "locale_id", nullable = false)
    val locale: Locale,

    @Column
    var name: String? = null,

    @Column(columnDefinition = "TEXT")
    var description: String? = null,

    @Column
    var metaTitle: String? = null,

    @Column(columnDefinition = "TEXT")
    var metaDescription: String? = null,

    @Column
    var urlKey: String? = null,

    @Column(nullable = false)
    val createdAt: Instant = Instant.now(),

    @Column(nullable = false)
    var updatedAt: Instant = Instant.now()
)

@Entity
@Table(
    name = "attribute_value_translations",
    uniqueConstraints = [UniqueConstraint(columnNames = ["attribute_value_id", "locale_id"])]
)
data class AttributeValueTranslation(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID = UUID.randomUUID(),

    @Column(name = "attribute_value_id", nullable = false)
    val attributeValueId: UUID,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "locale_id", nullable = false)
    val locale: Locale,

    @Column(columnDefinition = "TEXT")
    var textValue: String? = null,

    @Column(nullable = false)
    val createdAt: Instant = Instant.now(),

    @Column(nullable = false)
    var updatedAt: Instant = Instant.now()
)
