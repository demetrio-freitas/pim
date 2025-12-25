package com.pim.domain.attribute

import com.pim.domain.product.AttributeType
import jakarta.persistence.*
import org.springframework.data.annotation.CreatedDate
import org.springframework.data.annotation.LastModifiedDate
import org.springframework.data.jpa.domain.support.AuditingEntityListener
import java.time.Instant
import java.util.*

@Entity
@Table(name = "attributes")
@EntityListeners(AuditingEntityListener::class)
data class Attribute(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(nullable = false, unique = true)
    var code: String,

    @Column(nullable = false)
    var name: String,

    @Column(columnDefinition = "TEXT")
    var description: String? = null,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var type: AttributeType = AttributeType.TEXT,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id")
    var group: AttributeGroup? = null,

    @Column(name = "is_required", nullable = false)
    var isRequired: Boolean = false,

    @Column(name = "is_unique", nullable = false)
    var isUnique: Boolean = false,

    @Column(name = "is_filterable", nullable = false)
    var isFilterable: Boolean = false,

    @Column(name = "is_searchable", nullable = false)
    var isSearchable: Boolean = false,

    @Column(name = "is_localizable", nullable = false)
    var isLocalizable: Boolean = false,

    @Column(name = "is_scopable", nullable = false)
    var isScopable: Boolean = false,

    @Column(name = "use_in_grid", nullable = false)
    var useInGrid: Boolean = true,

    @Column(nullable = false)
    var position: Int = 0,

    @Column(name = "validation_rules", columnDefinition = "TEXT")
    var validationRules: String? = null,

    @Column(name = "default_value")
    var defaultValue: String? = null,

    @OneToMany(mappedBy = "attribute", cascade = [CascadeType.ALL], orphanRemoval = true)
    var options: MutableList<AttributeOption> = mutableListOf(),

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant = Instant.now(),

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()
) {
    fun addOption(option: AttributeOption) {
        options.add(option)
        option.attribute = this
    }

    fun removeOption(option: AttributeOption) {
        options.remove(option)
        option.attribute = null
    }
}

@Entity
@Table(name = "attribute_groups")
@EntityListeners(AuditingEntityListener::class)
data class AttributeGroup(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(nullable = false, unique = true)
    var code: String,

    @Column(nullable = false)
    var name: String,

    @Column(columnDefinition = "TEXT")
    var description: String? = null,

    @Column(nullable = false)
    var position: Int = 0,

    @OneToMany(mappedBy = "group", fetch = FetchType.LAZY)
    var attributes: MutableList<Attribute> = mutableListOf(),

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant = Instant.now(),

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()
)

@Entity
@Table(name = "attribute_options")
data class AttributeOption(
    @Id
    val id: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attribute_id", nullable = false)
    var attribute: Attribute? = null,

    @Column(nullable = false)
    var code: String,

    @Column(nullable = false)
    var label: String,

    @Column(nullable = false)
    var position: Int = 0,

    @Column(name = "is_default", nullable = false)
    var isDefault: Boolean = false
)
