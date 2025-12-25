package com.pim.domain.category

import jakarta.persistence.*
import org.springframework.data.annotation.CreatedDate
import org.springframework.data.annotation.LastModifiedDate
import org.springframework.data.jpa.domain.support.AuditingEntityListener
import java.time.Instant
import java.util.*

@Entity
@Table(name = "categories")
@EntityListeners(AuditingEntityListener::class)
data class Category(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(nullable = false, unique = true)
    var code: String,

    @Column(nullable = false)
    var name: String,

    @Column(columnDefinition = "TEXT")
    var description: String? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    var parent: Category? = null,

    @OneToMany(mappedBy = "parent", cascade = [CascadeType.ALL], fetch = FetchType.LAZY)
    var children: MutableList<Category> = mutableListOf(),

    @Column(nullable = false)
    var position: Int = 0,

    @Column(nullable = false)
    var level: Int = 0,

    @Column(nullable = false)
    var path: String = "",

    @Column(name = "is_active", nullable = false)
    var isActive: Boolean = true,

    @Column(name = "url_key", unique = true)
    var urlKey: String? = null,

    @Column(name = "meta_title")
    var metaTitle: String? = null,

    @Column(name = "meta_description", columnDefinition = "TEXT")
    var metaDescription: String? = null,

    var image: String? = null,

    @Column(name = "locale")
    var locale: String? = null,

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant = Instant.now(),

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()
) {
    @PrePersist
    @PreUpdate
    fun updatePath() {
        level = if (parent == null) 0 else parent!!.level + 1
        path = if (parent == null) id.toString() else "${parent!!.path}/$id"
    }

    fun addChild(child: Category) {
        children.add(child)
        child.parent = this
        child.updatePath()
    }

    fun removeChild(child: Category) {
        children.remove(child)
        child.parent = null
    }

    fun getAllAncestors(): List<Category> {
        val ancestors = mutableListOf<Category>()
        var current = parent
        while (current != null) {
            ancestors.add(current)
            current = current.parent
        }
        return ancestors.reversed()
    }

    fun getAllDescendants(): List<Category> {
        val descendants = mutableListOf<Category>()
        children.forEach { child ->
            descendants.add(child)
            descendants.addAll(child.getAllDescendants())
        }
        return descendants
    }
}
