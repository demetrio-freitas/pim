package com.pim.infrastructure.web

import com.pim.application.*
import com.pim.domain.user.User
import com.pim.infrastructure.persistence.UserRepository
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.web.bind.annotation.*
import java.util.*

// Request DTOs
data class CreateFamilyRequest(
    val code: String,
    val name: String,
    val description: String? = null,
    val imageUrl: String? = null,
    val isActive: Boolean = true
)

data class UpdateFamilyRequest(
    val code: String? = null,
    val name: String? = null,
    val description: String? = null,
    val imageUrl: String? = null,
    val isActive: Boolean? = null
)

data class AddFamilyAttributeRequest(
    val attributeId: UUID,
    val isRequired: Boolean = false,
    val weight: Int = 10,
    val position: Int = 0,
    val groupCode: String? = null,
    val defaultValue: String? = null,
    val placeholder: String? = null,
    val helpText: String? = null
)

data class SetFamilyAttributesRequest(
    val attributes: List<AddFamilyAttributeRequest>
)

data class SetChannelRequirementRequest(
    val channelId: UUID,
    val requiredAttributeIds: Set<UUID> = emptySet(),
    val minCompletenessScore: Int = 80
)

@RestController
@RequestMapping("/api/families")
@Tag(name = "Product Families", description = "Product family management")
class FamilyController(
    private val familyService: FamilyService,
    private val userRepository: UserRepository
) {

    private fun getUser(userDetails: UserDetails): User? {
        return userRepository.findByEmail(userDetails.username)
    }

    // ==================== FAMILY CRUD ====================

    @GetMapping
    @Operation(summary = "List all product families")
    @PreAuthorize("hasAuthority('products.view')")
    fun listFamilies(): ResponseEntity<List<ProductFamilyResponse>> {
        return ResponseEntity.ok(familyService.getAllFamilies())
    }

    @GetMapping("/active")
    @Operation(summary = "List active product families")
    @PreAuthorize("hasAuthority('products.view')")
    fun listActiveFamilies(): ResponseEntity<List<ProductFamilyResponse>> {
        return ResponseEntity.ok(familyService.getActiveFamilies())
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get product family by ID")
    @PreAuthorize("hasAuthority('products.view')")
    fun getFamily(@PathVariable id: UUID): ResponseEntity<ProductFamilyResponse> {
        val family = familyService.getFamily(id)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(family)
    }

    @GetMapping("/{id}/detail")
    @Operation(summary = "Get product family with full details")
    @PreAuthorize("hasAuthority('products.view')")
    fun getFamilyDetail(@PathVariable id: UUID): ResponseEntity<FamilyDetailResponse> {
        val detail = familyService.getFamilyDetail(id)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(detail)
    }

    @GetMapping("/code/{code}")
    @Operation(summary = "Get product family by code")
    @PreAuthorize("hasAuthority('products.view')")
    fun getFamilyByCode(@PathVariable code: String): ResponseEntity<ProductFamilyResponse> {
        val family = familyService.getFamilyByCode(code)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(family)
    }

    @PostMapping
    @Operation(summary = "Create a product family")
    @PreAuthorize("hasAuthority('settings.manage')")
    fun createFamily(
        @RequestBody request: CreateFamilyRequest,
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<ProductFamilyResponse> {
        val user = getUser(userDetails)
        val dto = ProductFamilyDto(
            code = request.code,
            name = request.name,
            description = request.description,
            imageUrl = request.imageUrl,
            isActive = request.isActive
        )
        return ResponseEntity.ok(familyService.createFamily(dto, user?.id))
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a product family")
    @PreAuthorize("hasAuthority('settings.manage')")
    fun updateFamily(
        @PathVariable id: UUID,
        @RequestBody request: UpdateFamilyRequest
    ): ResponseEntity<ProductFamilyResponse> {
        val existing = familyService.getFamily(id)
            ?: return ResponseEntity.notFound().build()

        val dto = ProductFamilyDto(
            id = id,
            code = request.code ?: existing.code,
            name = request.name ?: existing.name,
            description = request.description ?: existing.description,
            imageUrl = request.imageUrl ?: existing.imageUrl,
            isActive = request.isActive ?: existing.isActive
        )

        return ResponseEntity.ok(familyService.updateFamily(id, dto))
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a product family")
    @PreAuthorize("hasAuthority('settings.manage')")
    fun deleteFamily(@PathVariable id: UUID): ResponseEntity<Void> {
        familyService.deleteFamily(id)
        return ResponseEntity.noContent().build()
    }

    // ==================== FAMILY ATTRIBUTES ====================

    @GetMapping("/{familyId}/attributes")
    @Operation(summary = "Get attributes for a family")
    @PreAuthorize("hasAuthority('products.view')")
    fun getFamilyAttributes(@PathVariable familyId: UUID): ResponseEntity<List<FamilyAttributeResponse>> {
        return ResponseEntity.ok(familyService.getFamilyAttributes(familyId))
    }

    @GetMapping("/{familyId}/attributes/required")
    @Operation(summary = "Get required attributes for a family")
    @PreAuthorize("hasAuthority('products.view')")
    fun getRequiredAttributes(@PathVariable familyId: UUID): ResponseEntity<List<FamilyAttributeResponse>> {
        return ResponseEntity.ok(familyService.getRequiredAttributes(familyId))
    }

    @PostMapping("/{familyId}/attributes")
    @Operation(summary = "Add an attribute to a family")
    @PreAuthorize("hasAuthority('settings.manage')")
    fun addAttribute(
        @PathVariable familyId: UUID,
        @RequestBody request: AddFamilyAttributeRequest
    ): ResponseEntity<FamilyAttributeResponse> {
        val dto = FamilyAttributeDto(
            attributeId = request.attributeId,
            isRequired = request.isRequired,
            weight = request.weight,
            position = request.position,
            groupCode = request.groupCode,
            defaultValue = request.defaultValue,
            placeholder = request.placeholder,
            helpText = request.helpText
        )
        return ResponseEntity.ok(familyService.addAttribute(familyId, dto))
    }

    @PutMapping("/{familyId}/attributes/{attributeId}")
    @Operation(summary = "Update an attribute in a family")
    @PreAuthorize("hasAuthority('settings.manage')")
    fun updateAttribute(
        @PathVariable familyId: UUID,
        @PathVariable attributeId: UUID,
        @RequestBody request: AddFamilyAttributeRequest
    ): ResponseEntity<FamilyAttributeResponse> {
        val dto = FamilyAttributeDto(
            attributeId = attributeId,
            isRequired = request.isRequired,
            weight = request.weight,
            position = request.position,
            groupCode = request.groupCode,
            defaultValue = request.defaultValue,
            placeholder = request.placeholder,
            helpText = request.helpText
        )
        return ResponseEntity.ok(familyService.updateAttribute(familyId, attributeId, dto))
    }

    @DeleteMapping("/{familyId}/attributes/{attributeId}")
    @Operation(summary = "Remove an attribute from a family")
    @PreAuthorize("hasAuthority('settings.manage')")
    fun removeAttribute(
        @PathVariable familyId: UUID,
        @PathVariable attributeId: UUID
    ): ResponseEntity<Void> {
        familyService.removeAttribute(familyId, attributeId)
        return ResponseEntity.noContent().build()
    }

    @PutMapping("/{familyId}/attributes/bulk")
    @Operation(summary = "Set all attributes for a family")
    @PreAuthorize("hasAuthority('settings.manage')")
    fun setFamilyAttributes(
        @PathVariable familyId: UUID,
        @RequestBody request: SetFamilyAttributesRequest
    ): ResponseEntity<List<FamilyAttributeResponse>> {
        val dtos = request.attributes.map {
            FamilyAttributeDto(
                attributeId = it.attributeId,
                isRequired = it.isRequired,
                weight = it.weight,
                position = it.position,
                groupCode = it.groupCode,
                defaultValue = it.defaultValue,
                placeholder = it.placeholder,
                helpText = it.helpText
            )
        }
        familyService.setFamilyAttributes(familyId, dtos)
        return ResponseEntity.ok(familyService.getFamilyAttributes(familyId))
    }

    // ==================== CHANNEL REQUIREMENTS ====================

    @PostMapping("/{familyId}/channel-requirements")
    @Operation(summary = "Set channel requirements for a family")
    @PreAuthorize("hasAuthority('settings.manage')")
    fun setChannelRequirement(
        @PathVariable familyId: UUID,
        @RequestBody request: SetChannelRequirementRequest
    ): ResponseEntity<ChannelRequirementResponse> {
        return ResponseEntity.ok(
            familyService.setChannelRequirement(
                familyId,
                request.channelId,
                request.requiredAttributeIds,
                request.minCompletenessScore
            )
        )
    }
}
