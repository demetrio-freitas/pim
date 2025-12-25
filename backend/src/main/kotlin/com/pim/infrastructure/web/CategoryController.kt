package com.pim.infrastructure.web

import com.pim.application.CategoryService
import com.pim.application.CategoryTreeNode
import com.pim.domain.category.Category
import com.pim.infrastructure.persistence.ProductRepository
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*
import java.util.*

@RestController
@RequestMapping("/api/categories")
@Tag(name = "Categories", description = "Category management endpoints")
class CategoryController(
    private val categoryService: CategoryService,
    private val productRepository: ProductRepository
) {

    @GetMapping
    @Operation(summary = "List all categories")
    @PreAuthorize("hasAuthority('categories.view')")
    fun list(): ResponseEntity<List<CategoryResponse>> {
        val categories = categoryService.findAll()
        val productCounts = productRepository.countProductsByCategory()
            .associate { (it[0] as UUID) to (it[1] as Long).toInt() }
        return ResponseEntity.ok(categories.map { it.toResponse(productCounts[it.id] ?: 0) })
    }

    @GetMapping("/tree")
    @Operation(summary = "Get category tree")
    @PreAuthorize("hasAuthority('categories.view')")
    fun getTree(): ResponseEntity<List<CategoryTreeNode>> {
        return ResponseEntity.ok(categoryService.getTree())
    }

    @GetMapping("/roots")
    @Operation(summary = "Get root categories")
    @PreAuthorize("hasAuthority('categories.view')")
    fun getRoots(): ResponseEntity<List<CategoryResponse>> {
        val categories = categoryService.findRootCategories()
        return ResponseEntity.ok(categories.map { it.toResponse() })
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get category by ID")
    @PreAuthorize("hasAuthority('categories.view')")
    fun getById(@PathVariable id: UUID): ResponseEntity<CategoryDetailResponse> {
        val category = categoryService.findById(id)
            ?: return ResponseEntity.notFound().build()

        return ResponseEntity.ok(category.toDetailResponse())
    }

    @GetMapping("/{id}/children")
    @Operation(summary = "Get category children")
    @PreAuthorize("hasAuthority('categories.view')")
    fun getChildren(@PathVariable id: UUID): ResponseEntity<List<CategoryResponse>> {
        val children = categoryService.findChildren(id)
        return ResponseEntity.ok(children.map { it.toResponse() })
    }

    @GetMapping("/search")
    @Operation(summary = "Search categories")
    @PreAuthorize("hasAuthority('categories.view')")
    fun search(@RequestParam query: String): ResponseEntity<List<CategoryResponse>> {
        val categories = categoryService.search(query)
        return ResponseEntity.ok(categories.map { it.toResponse() })
    }

    @PostMapping
    @Operation(summary = "Create a root category")
    @PreAuthorize("hasAuthority('categories.create')")
    fun create(@Valid @RequestBody request: CreateCategoryRequest): ResponseEntity<CategoryResponse> {
        val category = Category(
            code = request.code,
            name = request.name,
            description = request.description,
            urlKey = request.urlKey,
            metaTitle = request.metaTitle,
            metaDescription = request.metaDescription,
            isActive = request.isActive ?: true
        )

        val created = categoryService.create(category)
        return ResponseEntity.status(HttpStatus.CREATED).body(created.toResponse())
    }

    @PostMapping("/{parentId}/children")
    @Operation(summary = "Create a child category")
    @PreAuthorize("hasAuthority('categories.create')")
    fun createChild(
        @PathVariable parentId: UUID,
        @Valid @RequestBody request: CreateCategoryRequest
    ): ResponseEntity<CategoryResponse> {
        val category = Category(
            code = request.code,
            name = request.name,
            description = request.description,
            urlKey = request.urlKey,
            metaTitle = request.metaTitle,
            metaDescription = request.metaDescription,
            isActive = request.isActive ?: true
        )

        val created = categoryService.createChild(parentId, category)
        return ResponseEntity.status(HttpStatus.CREATED).body(created.toResponse())
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a category")
    @PreAuthorize("hasAuthority('categories.edit')")
    fun update(
        @PathVariable id: UUID,
        @Valid @RequestBody request: UpdateCategoryRequest
    ): ResponseEntity<CategoryResponse> {
        val updated = categoryService.update(id) { category ->
            request.name?.let { category.name = it }
            request.description?.let { category.description = it }
            request.urlKey?.let { category.urlKey = it }
            request.metaTitle?.let { category.metaTitle = it }
            request.metaDescription?.let { category.metaDescription = it }
            request.isActive?.let { category.isActive = it }
            request.image?.let { category.image = it }
        }

        return ResponseEntity.ok(updated.toResponse())
    }

    @PatchMapping("/{id}/move")
    @Operation(summary = "Move category to new parent")
    @PreAuthorize("hasAuthority('categories.edit')")
    fun move(
        @PathVariable id: UUID,
        @RequestBody request: MoveCategoryRequest
    ): ResponseEntity<CategoryResponse> {
        val moved = categoryService.move(id, request.newParentId)
        return ResponseEntity.ok(moved.toResponse())
    }

    @PatchMapping("/reorder")
    @Operation(summary = "Reorder categories")
    @PreAuthorize("hasAuthority('categories.edit')")
    fun reorder(@RequestBody request: ReorderCategoriesRequest): ResponseEntity<Void> {
        categoryService.reorder(request.parentId, request.orderedIds)
        return ResponseEntity.noContent().build()
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a category")
    @PreAuthorize("hasAuthority('categories.delete')")
    fun delete(@PathVariable id: UUID): ResponseEntity<Void> {
        categoryService.delete(id)
        return ResponseEntity.noContent().build()
    }
}

// DTOs
data class CreateCategoryRequest(
    @field:NotBlank val code: String,
    @field:NotBlank val name: String,
    val description: String? = null,
    val urlKey: String? = null,
    val metaTitle: String? = null,
    val metaDescription: String? = null,
    val isActive: Boolean? = true
)

data class UpdateCategoryRequest(
    val name: String? = null,
    val description: String? = null,
    val urlKey: String? = null,
    val metaTitle: String? = null,
    val metaDescription: String? = null,
    val isActive: Boolean? = null,
    val image: String? = null
)

data class MoveCategoryRequest(val newParentId: UUID?)

data class ReorderCategoriesRequest(
    val parentId: UUID?,
    val orderedIds: List<UUID>
)

data class CategoryResponse(
    val id: UUID,
    val code: String,
    val name: String,
    val level: Int,
    val position: Int,
    val isActive: Boolean,
    val parentId: UUID?,
    val childCount: Int,
    val productCount: Int
)

data class CategoryDetailResponse(
    val id: UUID,
    val code: String,
    val name: String,
    val description: String?,
    val level: Int,
    val position: Int,
    val path: String,
    val isActive: Boolean,
    val urlKey: String?,
    val metaTitle: String?,
    val metaDescription: String?,
    val image: String?,
    val parentId: UUID?,
    val children: List<CategoryResponse>
)

fun Category.toResponse(productCount: Int = 0) = CategoryResponse(
    id = id,
    code = code,
    name = name,
    level = level,
    position = position,
    isActive = isActive,
    parentId = parent?.id,
    childCount = children.size,
    productCount = productCount
)

fun Category.toDetailResponse() = CategoryDetailResponse(
    id = id,
    code = code,
    name = name,
    description = description,
    level = level,
    position = position,
    path = path,
    isActive = isActive,
    urlKey = urlKey,
    metaTitle = metaTitle,
    metaDescription = metaDescription,
    image = image,
    parentId = parent?.id,
    children = children.map { it.toResponse() }
)
