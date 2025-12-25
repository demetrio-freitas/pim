package com.pim.infrastructure.persistence

import com.pim.domain.family.*
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface ProductFamilyRepository : JpaRepository<ProductFamily, UUID> {
    fun findByCode(code: String): ProductFamily?
    fun existsByCode(code: String): Boolean
    fun findByIsActiveOrderByNameAsc(isActive: Boolean): List<ProductFamily>
    fun findAllByOrderByNameAsc(): List<ProductFamily>

    @Query("SELECT f FROM ProductFamily f WHERE LOWER(f.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(f.code) LIKE LOWER(CONCAT('%', :query, '%'))")
    fun search(@Param("query") query: String, pageable: Pageable): Page<ProductFamily>
}

@Repository
interface FamilyAttributeRepository : JpaRepository<FamilyAttribute, UUID> {
    fun findByFamilyIdOrderByPositionAsc(familyId: UUID): List<FamilyAttribute>
    fun findByFamilyIdAndIsRequired(familyId: UUID, isRequired: Boolean): List<FamilyAttribute>
    fun findByFamilyIdAndAttributeId(familyId: UUID, attributeId: UUID): FamilyAttribute?
    fun deleteByFamilyId(familyId: UUID)
    fun existsByFamilyIdAndAttributeId(familyId: UUID, attributeId: UUID): Boolean

    @Query("SELECT fa FROM FamilyAttribute fa WHERE fa.familyId = :familyId AND fa.groupCode = :groupCode ORDER BY fa.position")
    fun findByFamilyIdAndGroupCode(
        @Param("familyId") familyId: UUID,
        @Param("groupCode") groupCode: String
    ): List<FamilyAttribute>

    @Query("SELECT DISTINCT fa.groupCode FROM FamilyAttribute fa WHERE fa.familyId = :familyId AND fa.groupCode IS NOT NULL")
    fun findDistinctGroupCodesByFamilyId(@Param("familyId") familyId: UUID): List<String>
}

@Repository
interface FamilyChannelRequirementRepository : JpaRepository<FamilyChannelRequirement, UUID> {
    fun findByFamilyId(familyId: UUID): List<FamilyChannelRequirement>
    fun findByFamilyIdAndChannelId(familyId: UUID, channelId: UUID): FamilyChannelRequirement?
    fun deleteByFamilyId(familyId: UUID)
    fun deleteByChannelId(channelId: UUID)
}
