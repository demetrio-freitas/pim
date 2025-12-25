package com.pim.application

import com.pim.domain.category.Category
import com.pim.infrastructure.persistence.CategoryRepository
import com.pim.infrastructure.persistence.ProductRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

@Service
@Transactional
class CategoryService(
    private val categoryRepository: CategoryRepository,
    private val productRepository: ProductRepository
) {

    fun findById(id: UUID): Category? {
        return categoryRepository.findByIdWithChildren(id)
    }

    fun findByCode(code: String): Category? {
        return categoryRepository.findByCode(code)
    }

    fun findAll(): List<Category> {
        return categoryRepository.findAllActive()
    }

    fun findRootCategories(): List<Category> {
        return categoryRepository.findRootCategories()
    }

    fun findChildren(parentId: UUID): List<Category> {
        return categoryRepository.findByParentId(parentId)
    }

    fun search(query: String): List<Category> {
        return categoryRepository.search(query)
    }

    fun create(category: Category): Category {
        if (categoryRepository.existsByCode(category.code)) {
            throw IllegalArgumentException("Category with code '${category.code}' already exists")
        }

        if (category.urlKey == null) {
            category.urlKey = generateUrlKey(category.name)
        }

        return categoryRepository.save(category)
    }

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

    fun update(id: UUID, updateFn: (Category) -> Unit): Category {
        val category = categoryRepository.findById(id)
            .orElseThrow { NoSuchElementException("Category not found with id: $id") }

        updateFn(category)

        return categoryRepository.save(category)
    }

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

    fun reorder(parentId: UUID?, orderedIds: List<UUID>) {
        val categories = if (parentId == null) {
            categoryRepository.findRootCategories()
        } else {
            categoryRepository.findByParentId(parentId)
        }

        orderedIds.forEachIndexed { index, id ->
            categories.find { it.id == id }?.let { category ->
                category.position = index
                categoryRepository.save(category)
            }
        }
    }

    fun delete(id: UUID) {
        val category = categoryRepository.findByIdWithChildren(id)
            ?: throw NoSuchElementException("Category not found with id: $id")

        if (category.children.isNotEmpty()) {
            throw IllegalStateException("Cannot delete category with children. Delete children first or move them.")
        }

        categoryRepository.deleteById(id)
    }

    fun getTree(): List<CategoryTreeNode> {
        val roots = categoryRepository.findRootCategories()
        val productCounts = productRepository.countProductsByCategory()
            .associate { (it[0] as UUID) to (it[1] as Long).toInt() }
        return roots.map { buildTree(it, productCounts) }
    }

    private fun buildTree(category: Category, productCounts: Map<UUID, Int>): CategoryTreeNode {
        val children = categoryRepository.findByParentId(category.id)
        return CategoryTreeNode(
            id = category.id,
            code = category.code,
            name = category.name,
            level = category.level,
            position = category.position,
            isActive = category.isActive,
            children = children.map { buildTree(it, productCounts) },
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
