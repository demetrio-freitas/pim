package com.pim.application

import com.pim.domain.category.Category
import com.pim.infrastructure.persistence.CategoryRepository
import com.pim.infrastructure.persistence.ProductRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

@Service
class CategoryService(
    private val categoryRepository: CategoryRepository,
    private val productRepository: ProductRepository
) {

    @Transactional(readOnly = true)
    fun findById(id: UUID): Category? {
        return categoryRepository.findByIdWithChildren(id)
    }

    @Transactional(readOnly = true)
    fun findByCode(code: String): Category? {
        return categoryRepository.findByCode(code)
    }

    @Transactional(readOnly = true)
    fun findAll(): List<Category> {
        return categoryRepository.findAllActive()
    }

    @Transactional(readOnly = true)
    fun findRootCategories(): List<Category> {
        return categoryRepository.findRootCategories()
    }

    @Transactional(readOnly = true)
    fun findChildren(parentId: UUID): List<Category> {
        return categoryRepository.findByParentId(parentId)
    }

    @Transactional(readOnly = true)
    fun search(query: String): List<Category> {
        return categoryRepository.search(query)
    }

    @Transactional
    fun create(category: Category): Category {
        if (categoryRepository.existsByCode(category.code)) {
            throw IllegalArgumentException("Category with code '${category.code}' already exists")
        }

        if (category.urlKey == null) {
            category.urlKey = generateUrlKey(category.name)
        }

        return categoryRepository.save(category)
    }

    @Transactional
    fun createChild(parentId: UUID, category: Category): Category {
        val parent = categoryRepository.findById(parentId)
            .orElseThrow { NoSuchElementException("Parent category not found with id: $parentId") }

        if (categoryRepository.existsByCode(category.code)) {
            throw IllegalArgumentException("Category with code '${category.code}' already exists")
        }

        category.parent = parent
        category.position = parent.children.size

        if (category.urlKey == null) {
            category.urlKey = generateUrlKey(category.name)
        }

        return categoryRepository.save(category)
    }

    @Transactional
    fun update(id: UUID, updateFn: (Category) -> Unit): Category {
        val category = categoryRepository.findById(id)
            .orElseThrow { NoSuchElementException("Category not found with id: $id") }

        updateFn(category)

        return categoryRepository.save(category)
    }

    @Transactional
    fun move(categoryId: UUID, newParentId: UUID?): Category {
        val category = categoryRepository.findById(categoryId)
            .orElseThrow { NoSuchElementException("Category not found with id: $categoryId") }

        val newParent = if (newParentId != null) {
            categoryRepository.findById(newParentId)
                .orElseThrow { NoSuchElementException("Parent category not found with id: $newParentId") }
        } else null

        // Prevent circular reference
        if (newParent != null && isDescendantOf(newParent, category)) {
            throw IllegalArgumentException("Cannot move category to its own descendant")
        }

        category.parent = newParent
        return categoryRepository.save(category)
    }

    /**
     * Reorder categories using batch updates instead of individual saves.
     * Optimized: Uses single UPDATE query per category instead of SELECT + UPDATE.
     */
    @Transactional
    fun reorder(parentId: UUID?, orderedIds: List<UUID>) {
        // Use batch update instead of loading and saving each category individually
        orderedIds.forEachIndexed { index, id ->
            categoryRepository.updatePosition(id, index)
        }
    }

    @Transactional
    fun delete(id: UUID) {
        val category = categoryRepository.findByIdWithChildren(id)
            ?: throw NoSuchElementException("Category not found with id: $id")

        if (category.children.isNotEmpty()) {
            throw IllegalStateException("Cannot delete category with children. Delete children first or move them.")
        }

        categoryRepository.deleteById(id)
    }

    /**
     * Get the complete category tree.
     * Optimized: Fetches all categories in a single query and builds tree in memory.
     * Previously caused N+1 queries (O(n) queries for n categories).
     */
    @Transactional(readOnly = true)
    fun getTree(): List<CategoryTreeNode> {
        // Fetch all categories with children in a single query
        val allCategories = categoryRepository.findAllWithChildren()

        // Build a map for quick lookup by parent ID
        val childrenByParentId = allCategories.groupBy { it.parent?.id }

        // Get product counts in a single query
        val productCounts = productRepository.countProductsByCategory()
            .associate { (it[0] as UUID) to (it[1] as Long).toInt() }

        // Get root categories (those without parent)
        val roots = childrenByParentId[null] ?: emptyList()

        // Build tree recursively using in-memory data (no additional queries)
        return roots
            .sortedBy { it.position }
            .map { buildTreeFromMemory(it, childrenByParentId, productCounts) }
    }

    /**
     * Build tree node from in-memory data without additional database queries.
     */
    private fun buildTreeFromMemory(
        category: Category,
        childrenByParentId: Map<UUID?, List<Category>>,
        productCounts: Map<UUID, Int>
    ): CategoryTreeNode {
        val children = childrenByParentId[category.id] ?: emptyList()
        return CategoryTreeNode(
            id = category.id,
            code = category.code,
            name = category.name,
            level = category.level,
            position = category.position,
            isActive = category.isActive,
            children = children
                .sortedBy { it.position }
                .map { buildTreeFromMemory(it, childrenByParentId, productCounts) },
            productCount = productCounts[category.id] ?: 0
        )
    }

    private fun isDescendantOf(category: Category, potentialAncestor: Category): Boolean {
        var current = category.parent
        while (current != null) {
            if (current.id == potentialAncestor.id) return true
            current = current.parent
        }
        return false
    }

    private fun generateUrlKey(name: String): String {
        return name.lowercase()
            .replace(Regex("[^a-z0-9\\s-]"), "")
            .replace(Regex("\\s+"), "-")
            .replace(Regex("-+"), "-")
            .trim('-')
    }
}

data class CategoryTreeNode(
    val id: UUID,
    val code: String,
    val name: String,
    val level: Int,
    val position: Int,
    val isActive: Boolean,
    val children: List<CategoryTreeNode>,
    val productCount: Int = 0
)
