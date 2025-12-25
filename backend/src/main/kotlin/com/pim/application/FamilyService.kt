package com.pim.application

import com.pim.domain.family.*
import com.pim.domain.product.Product
import com.pim.infrastructure.persistence.*
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.*

// DTOs
data class ProductFamilyDto(
    val id: UUID? = null,
    val code: String,
    val name: String,
    val description: String? = null,
    val imageUrl: String? = null,
    val isActive: Boolean = true
)

data class ProductFamilyResponse(
    val id: UUID,
    val code: String,
    val name: String,
    val description: String?,
    val imageUrl: String?,
    val isActive: Boolean,
    val productCount: Int,
    val attributeCount: Int,
    val requiredAttributeCount: Int,
    val createdAt: Instant,
    val updatedAt: Instant
)

data class FamilyAttributeDto(
    val attributeId: UUID,
    val isRequired: Boolean = false,
    val weight: Int = 10,
    val position: Int = 0,
    val groupCode: String? = null,
    val defaultValue: String? = null,
    val placeholder: String? = null,
    val helpText: String? = null
)

data class FamilyAttributeResponse(
    val id: UUID,
    val attributeId: UUID,
    val attributeCode: String,
    val attributeName: String,
    val attributeType: String,
    val isRequired: Boolean,
    val weight: Int,
    val position: Int,
    val groupCode: String?,
    val defaultValue: String?,
    val placeholder: String?,
    val helpText: String?
)

data class FamilyDetailResponse(
    val family: ProductFamilyResponse,
    val attributes: List<FamilyAttributeResponse>,
    val groups: List<String>,
    val channelRequirements: List<ChannelRequirementResponse>
)

data class ChannelRequirementResponse(
    val channelId: UUID,
    val channelCode: String,
    val channelName: String,
    val requiredAttributeIds: Set<UUID>,
    val minCompletenessScore: Int
)

data class FamilyCompletenessResult(
    val score: Int,
    val totalWeight: Int,
    val filledWeight: Int,
    val missingRequired: List<String>,
    val missingOptional: List<String>
)

@Service
class FamilyService(
    private val familyRepository: ProductFamilyRepository,
    private val familyAttributeRepository: FamilyAttributeRepository,
    private val channelRequirementRepository: FamilyChannelRequirementRepository,
    private val attributeRepository: AttributeRepository,
    private val channelRepository: ChannelRepository,
    private val productRepository: ProductRepository
) {

    // ==================== FAMILY CRUD ====================

    fun getAllFamilies(): List<ProductFamilyResponse> {
        return familyRepository.findAllByOrderByNameAsc().map { toResponse(it) }
    }

    fun getActiveFamilies(): List<ProductFamilyResponse> {
        return familyRepository.findByIsActiveOrderByNameAsc(true).map { toResponse(it) }
    }

    fun getFamily(id: UUID): ProductFamilyResponse? {
        return familyRepository.findById(id).orElse(null)?.let { toResponse(it) }
    }

    fun getFamilyByCode(code: String): ProductFamilyResponse? {
        return familyRepository.findByCode(code)?.let { toResponse(it) }
    }

    fun getFamilyDetail(id: UUID): FamilyDetailResponse? {
        val family = familyRepository.findById(id).orElse(null) ?: return null

        val attributes = familyAttributeRepository.findByFamilyIdOrderByPositionAsc(id)
            .map { toAttributeResponse(it) }

        val groups = familyAttributeRepository.findDistinctGroupCodesByFamilyId(id)

        val channelRequirements = channelRequirementRepository.findByFamilyId(id)
            .map { req ->
                val channel = channelRepository.findById(req.channelId).orElse(null)
                ChannelRequirementResponse(
                    channelId = req.channelId,
                    channelCode = channel?.code ?: "",
                    channelName = channel?.name ?: "",
                    requiredAttributeIds = req.requiredAttributeIds,
                    minCompletenessScore = req.minCompletenessScore
                )
            }

        return FamilyDetailResponse(
            family = toResponse(family),
            attributes = attributes,
            groups = groups,
            channelRequirements = channelRequirements
        )
    }

    @Transactional
    fun createFamily(dto: ProductFamilyDto, userId: UUID? = null): ProductFamilyResponse {
        if (familyRepository.existsByCode(dto.code)) {
            throw IllegalArgumentException("Família com código '${dto.code}' já existe")
        }

        val family = ProductFamily(
            code = dto.code,
            name = dto.name,
            description = dto.description,
            imageUrl = dto.imageUrl,
            isActive = dto.isActive,
            createdBy = userId
        )

        return toResponse(familyRepository.save(family))
    }

    @Transactional
    fun updateFamily(id: UUID, dto: ProductFamilyDto): ProductFamilyResponse {
        val family = familyRepository.findById(id).orElseThrow {
            IllegalArgumentException("Família não encontrada")
        }

        if (dto.code != family.code && familyRepository.existsByCode(dto.code)) {
            throw IllegalArgumentException("Família com código '${dto.code}' já existe")
        }

        family.apply {
            code = dto.code
            name = dto.name
            description = dto.description
            imageUrl = dto.imageUrl
            isActive = dto.isActive
        }

        return toResponse(familyRepository.save(family))
    }

    @Transactional
    fun deleteFamily(id: UUID) {
        val family = familyRepository.findById(id).orElseThrow {
            IllegalArgumentException("Família não encontrada")
        }

        if (family.productCount > 0) {
            throw IllegalArgumentException("Não é possível excluir. Esta família está em uso por ${family.productCount} produtos.")
        }

        familyAttributeRepository.deleteByFamilyId(id)
        channelRequirementRepository.deleteByFamilyId(id)
        familyRepository.delete(family)
    }

    // ==================== FAMILY ATTRIBUTES ====================

    fun getFamilyAttributes(familyId: UUID): List<FamilyAttributeResponse> {
        return familyAttributeRepository.findByFamilyIdOrderByPositionAsc(familyId)
            .map { toAttributeResponse(it) }
    }

    fun getRequiredAttributes(familyId: UUID): List<FamilyAttributeResponse> {
        return familyAttributeRepository.findByFamilyIdAndIsRequired(familyId, true)
            .map { toAttributeResponse(it) }
    }

    @Transactional
    fun addAttribute(familyId: UUID, dto: FamilyAttributeDto): FamilyAttributeResponse {
        if (!familyRepository.existsById(familyId)) {
            throw IllegalArgumentException("Família não encontrada")
        }

        if (!attributeRepository.existsById(dto.attributeId)) {
            throw IllegalArgumentException("Atributo não encontrado")
        }

        if (familyAttributeRepository.existsByFamilyIdAndAttributeId(familyId, dto.attributeId)) {
            throw IllegalArgumentException("Atributo já existe nesta família")
        }

        val familyAttribute = FamilyAttribute(
            familyId = familyId,
            attributeId = dto.attributeId,
            isRequired = dto.isRequired,
            weight = dto.weight,
            position = dto.position,
            groupCode = dto.groupCode,
            defaultValue = dto.defaultValue,
            placeholder = dto.placeholder,
            helpText = dto.helpText
        )

        return toAttributeResponse(familyAttributeRepository.save(familyAttribute))
    }

    @Transactional
    fun updateAttribute(familyId: UUID, attributeId: UUID, dto: FamilyAttributeDto): FamilyAttributeResponse {
        val familyAttribute = familyAttributeRepository.findByFamilyIdAndAttributeId(familyId, attributeId)
            ?: throw IllegalArgumentException("Atributo não encontrado nesta família")

        familyAttribute.apply {
            isRequired = dto.isRequired
            weight = dto.weight
            position = dto.position
            groupCode = dto.groupCode
            defaultValue = dto.defaultValue
            placeholder = dto.placeholder
            helpText = dto.helpText
        }

        return toAttributeResponse(familyAttributeRepository.save(familyAttribute))
    }

    @Transactional
    fun removeAttribute(familyId: UUID, attributeId: UUID) {
        val familyAttribute = familyAttributeRepository.findByFamilyIdAndAttributeId(familyId, attributeId)
            ?: throw IllegalArgumentException("Atributo não encontrado nesta família")
        familyAttributeRepository.delete(familyAttribute)
    }

    @Transactional
    fun setFamilyAttributes(familyId: UUID, attributes: List<FamilyAttributeDto>) {
        if (!familyRepository.existsById(familyId)) {
            throw IllegalArgumentException("Família não encontrada")
        }

        // Remove existing
        familyAttributeRepository.deleteByFamilyId(familyId)

        // Add new
        attributes.forEachIndexed { index, dto ->
            if (attributeRepository.existsById(dto.attributeId)) {
                val familyAttribute = FamilyAttribute(
                    familyId = familyId,
                    attributeId = dto.attributeId,
                    isRequired = dto.isRequired,
                    weight = dto.weight,
                    position = dto.position.takeIf { it > 0 } ?: index,
                    groupCode = dto.groupCode,
                    defaultValue = dto.defaultValue,
                    placeholder = dto.placeholder,
                    helpText = dto.helpText
                )
                familyAttributeRepository.save(familyAttribute)
            }
        }
    }

    // ==================== CHANNEL REQUIREMENTS ====================

    @Transactional
    fun setChannelRequirement(
        familyId: UUID,
        channelId: UUID,
        requiredAttributeIds: Set<UUID>,
        minCompletenessScore: Int = 80
    ): ChannelRequirementResponse {
        if (!familyRepository.existsById(familyId)) {
            throw IllegalArgumentException("Família não encontrada")
        }

        val channel = channelRepository.findById(channelId).orElseThrow {
            IllegalArgumentException("Canal não encontrado")
        }

        val existing = channelRequirementRepository.findByFamilyIdAndChannelId(familyId, channelId)
        val requirement = if (existing != null) {
            existing.requiredAttributeIds = requiredAttributeIds.toMutableSet()
            existing.minCompletenessScore = minCompletenessScore
            channelRequirementRepository.save(existing)
        } else {
            val newReq = FamilyChannelRequirement(
                familyId = familyId,
                channelId = channelId,
                requiredAttributeIds = requiredAttributeIds.toMutableSet(),
                minCompletenessScore = minCompletenessScore
            )
            channelRequirementRepository.save(newReq)
        }

        return ChannelRequirementResponse(
            channelId = channelId,
            channelCode = channel.code,
            channelName = channel.name,
            requiredAttributeIds = requirement.requiredAttributeIds,
            minCompletenessScore = requirement.minCompletenessScore
        )
    }

    // ==================== COMPLETENESS ====================

    fun calculateCompleteness(product: Product, familyId: UUID): FamilyCompletenessResult {
        val familyAttributes = familyAttributeRepository.findByFamilyIdOrderByPositionAsc(familyId)

        if (familyAttributes.isEmpty()) {
            return FamilyCompletenessResult(
                score = 100,
                totalWeight = 0,
                filledWeight = 0,
                missingRequired = emptyList(),
                missingOptional = emptyList()
            )
        }

        var totalWeight = 0
        var filledWeight = 0
        val missingRequired = mutableListOf<String>()
        val missingOptional = mutableListOf<String>()

        // Build map of product attribute values
        val productValues = product.attributes.associate { pa ->
            pa.attribute.id to pa.getValue()
        }

        for (fa in familyAttributes) {
            totalWeight += fa.weight
            val value = productValues[fa.attributeId]
            val isFilled = value != null && value.toString().isNotBlank()

            if (isFilled) {
                filledWeight += fa.weight
            } else {
                val attr = attributeRepository.findById(fa.attributeId).orElse(null)
                val attrName = attr?.name ?: fa.attributeId.toString()
                if (fa.isRequired) {
                    missingRequired.add(attrName)
                } else {
                    missingOptional.add(attrName)
                }
            }
        }

        val score = if (totalWeight > 0) (filledWeight * 100) / totalWeight else 100

        return FamilyCompletenessResult(
            score = score,
            totalWeight = totalWeight,
            filledWeight = filledWeight,
            missingRequired = missingRequired,
            missingOptional = missingOptional
        )
    }

    fun calculateCompletenessForChannel(product: Product, familyId: UUID, channelId: UUID): FamilyCompletenessResult {
        val baseResult = calculateCompleteness(product, familyId)

        // Check additional channel requirements
        val channelReq = channelRequirementRepository.findByFamilyIdAndChannelId(familyId, channelId)
            ?: return baseResult

        val productValues = product.attributes.associate { pa ->
            pa.attribute.id to pa.getValue()
        }

        val additionalMissing = mutableListOf<String>()
        for (attrId in channelReq.requiredAttributeIds) {
            val value = productValues[attrId]
            if (value == null || value.toString().isBlank()) {
                val attr = attributeRepository.findById(attrId).orElse(null)
                additionalMissing.add(attr?.name ?: attrId.toString())
            }
        }

        return baseResult.copy(
            missingRequired = baseResult.missingRequired + additionalMissing
        )
    }

    // ==================== HELPERS ====================

    private fun toResponse(family: ProductFamily): ProductFamilyResponse {
        val attributeCount = familyAttributeRepository.findByFamilyIdOrderByPositionAsc(family.id).size
        val requiredCount = familyAttributeRepository.findByFamilyIdAndIsRequired(family.id, true).size

        return ProductFamilyResponse(
            id = family.id,
            code = family.code,
            name = family.name,
            description = family.description,
            imageUrl = family.imageUrl,
            isActive = family.isActive,
            productCount = family.productCount,
            attributeCount = attributeCount,
            requiredAttributeCount = requiredCount,
            createdAt = family.createdAt,
            updatedAt = family.updatedAt
        )
    }

    private fun toAttributeResponse(fa: FamilyAttribute): FamilyAttributeResponse {
        val attribute = attributeRepository.findById(fa.attributeId).orElse(null)

        return FamilyAttributeResponse(
            id = fa.id,
            attributeId = fa.attributeId,
            attributeCode = attribute?.code ?: "",
            attributeName = attribute?.name ?: "",
            attributeType = attribute?.type?.name ?: "",
            isRequired = fa.isRequired,
            weight = fa.weight,
            position = fa.position,
            groupCode = fa.groupCode,
            defaultValue = fa.defaultValue,
            placeholder = fa.placeholder,
            helpText = fa.helpText
        )
    }
}
