package com.pim.infrastructure.web

import com.pim.application.AttributeService
import com.pim.domain.attribute.Attribute
import com.pim.domain.attribute.AttributeGroup
import com.pim.domain.product.AttributeType
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
@RequestMapping("/api/attributes")
@Tag(name = "Attributes", description = "Attribute management endpoints")
class AttributeController(
    private val attributeService: AttributeService
) {

    @GetMapping
    @Operation(summary = "List all attributes")
    @PreAuthorize("hasAuthority('products.view')")
    fun list(): ResponseEntity<List<AttributeResponse>> {
        val attributes = attributeService.findAllAttributes()
        return ResponseEntity.ok(attributes.map { it.toResponse() })
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get attribute by ID")
    @PreAuthorize("hasAuthority('products.view')")
    fun getById(@PathVariable id: UUID): ResponseEntity<AttributeDetailResponse> {
        val attribute = attributeService.findAttributeById(id)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(attribute.toDetailResponse())
    }

    @PostMapping
    @Operation(summary = "Create a new attribute")
    @PreAuthorize("hasAuthority('products.create')")
    fun create(@Valid @RequestBody request: CreateAttributeRequest): ResponseEntity<AttributeResponse> {
        val attribute = Attribute(
            code = request.code,
            name = request.name,
            description = request.description,
            type = request.type,
            isRequired = request.isRequired ?: false,
            isUnique = request.isUnique ?: false,
            isFilterable = request.isFilterable ?: false,
            isSearchable = request.isSearchable ?: false,
            isLocalizable = request.isLocalizable ?: false,
            isScopable = request.isScopable ?: false,
            useInGrid = request.useInGrid ?: true,
            defaultValue = request.defaultValue
        )
        val created = attributeService.createAttribute(attribute)
        return ResponseEntity.status(HttpStatus.CREATED).body(created.toResponse())
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an attribute")
    @PreAuthorize("hasAuthority('products.edit')")
    fun update(
        @PathVariable id: UUID,
        @Valid @RequestBody request: UpdateAttributeRequest
    ): ResponseEntity<AttributeResponse> {
        val updated = attributeService.updateAttribute(id) { attr ->
            request.name?.let { attr.name = it }
            request.description?.let { attr.description = it }
            request.isRequired?.let { attr.isRequired = it }
            request.isFilterable?.let { attr.isFilterable = it }
            request.isSearchable?.let { attr.isSearchable = it }
            request.useInGrid?.let { attr.useInGrid = it }
            request.defaultValue?.let { attr.defaultValue = it }
        }
        return ResponseEntity.ok(updated.toResponse())
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete an attribute")
    @PreAuthorize("hasAuthority('products.delete')")
    fun delete(@PathVariable id: UUID): ResponseEntity<Void> {
        attributeService.deleteAttribute(id)
        return ResponseEntity.noContent().build()
    }
}

@RestController
@RequestMapping("/api/attribute-groups")
@Tag(name = "Attribute Groups", description = "Attribute group management endpoints")
class AttributeGroupController(
    private val attributeService: AttributeService
) {

    @GetMapping
    @Operation(summary = "List all attribute groups")
    @PreAuthorize("hasAuthority('products.view')")
    fun list(): ResponseEntity<List<AttributeGroupResponse>> {
        val groups = attributeService.findAllGroups()
        return ResponseEntity.ok(groups.map { it.toResponse() })
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get attribute group by ID")
    @PreAuthorize("hasAuthority('products.view')")
    fun getById(@PathVariable id: UUID): ResponseEntity<AttributeGroupDetailResponse> {
        val group = attributeService.findGroupById(id)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(group.toDetailResponse())
    }

    @PostMapping
    @Operation(summary = "Create a new attribute group")
    @PreAuthorize("hasAuthority('products.create')")
    fun create(@Valid @RequestBody request: CreateAttributeGroupRequest): ResponseEntity<AttributeGroupResponse> {
        val group = AttributeGroup(
            code = request.code,
            name = request.name,
            description = request.description,
            position = request.position ?: 0
        )
        val created = attributeService.createGroup(group)
        return ResponseEntity.status(HttpStatus.CREATED).body(created.toResponse())
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an attribute group")
    @PreAuthorize("hasAuthority('products.edit')")
    fun update(
        @PathVariable id: UUID,
        @Valid @RequestBody request: UpdateAttributeGroupRequest
    ): ResponseEntity<AttributeGroupResponse> {
        val updated = attributeService.updateGroup(id) { group ->
            request.name?.let { group.name = it }
            request.description?.let { group.description = it }
            request.position?.let { group.position = it }
        }
        return ResponseEntity.ok(updated.toResponse())
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete an attribute group")
    @PreAuthorize("hasAuthority('products.delete')")
    fun delete(@PathVariable id: UUID): ResponseEntity<Void> {
        attributeService.deleteGroup(id)
        return ResponseEntity.noContent().build()
    }
}

// DTOs
data class CreateAttributeRequest(
    @field:NotBlank val code: String,
    @field:NotBlank val name: String,
    val description: String? = null,
    val type: AttributeType = AttributeType.TEXT,
    val isRequired: Boolean? = false,
    val isUnique: Boolean? = false,
    val isFilterable: Boolean? = false,
    val isSearchable: Boolean? = false,
    val isLocalizable: Boolean? = false,
    val isScopable: Boolean? = false,
    val useInGrid: Boolean? = true,
    val defaultValue: String? = null
)

data class UpdateAttributeRequest(
    val name: String? = null,
    val description: String? = null,
    val isRequired: Boolean? = null,
    val isFilterable: Boolean? = null,
    val isSearchable: Boolean? = null,
    val useInGrid: Boolean? = null,
    val defaultValue: String? = null
)

data class CreateAttributeGroupRequest(
    @field:NotBlank val code: String,
    @field:NotBlank val name: String,
    val description: String? = null,
    val position: Int? = 0
)

data class UpdateAttributeGroupRequest(
    val name: String? = null,
    val description: String? = null,
    val position: Int? = null
)

data class AttributeResponse(
    val id: UUID,
    val code: String,
    val name: String,
    val type: AttributeType,
    val isRequired: Boolean,
    val isFilterable: Boolean,
    val isSearchable: Boolean,
    val useInGrid: Boolean
)

data class AttributeDetailResponse(
    val id: UUID,
    val code: String,
    val name: String,
    val description: String?,
    val type: AttributeType,
    val isRequired: Boolean,
    val isUnique: Boolean,
    val isFilterable: Boolean,
    val isSearchable: Boolean,
    val isLocalizable: Boolean,
    val isScopable: Boolean,
    val useInGrid: Boolean,
    val defaultValue: String?,
    val options: List<AttributeOptionResponse>
)

data class AttributeOptionResponse(
    val id: UUID,
    val code: String,
    val label: String,
    val position: Int,
    val isDefault: Boolean
)

data class AttributeGroupResponse(
    val id: UUID,
    val code: String,
    val name: String,
    val position: Int,
    val attributeCount: Int
)

data class AttributeGroupDetailResponse(
    val id: UUID,
    val code: String,
    val name: String,
    val description: String?,
    val position: Int,
    val attributes: List<AttributeResponse>
)

fun Attribute.toResponse() = AttributeResponse(
    id = id,
    code = code,
    name = name,
    type = type,
    isRequired = isRequired,
    isFilterable = isFilterable,
    isSearchable = isSearchable,
    useInGrid = useInGrid
)

fun Attribute.toDetailResponse() = AttributeDetailResponse(
    id = id,
    code = code,
    name = name,
    description = description,
    type = type,
    isRequired = isRequired,
    isUnique = isUnique,
    isFilterable = isFilterable,
    isSearchable = isSearchable,
    isLocalizable = isLocalizable,
    isScopable = isScopable,
    useInGrid = useInGrid,
    defaultValue = defaultValue,
    options = options.map { AttributeOptionResponse(it.id, it.code, it.label, it.position, it.isDefault) }
)

fun AttributeGroup.toResponse() = AttributeGroupResponse(
    id = id,
    code = code,
    name = name,
    position = position,
    attributeCount = attributes.size
)

fun AttributeGroup.toDetailResponse() = AttributeGroupDetailResponse(
    id = id,
    code = code,
    name = name,
    description = description,
    position = position,
    attributes = attributes.map { it.toResponse() }
)
