package com.pim.infrastructure.persistence

import com.pim.domain.variant.*
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface VariantAxisRepository : JpaRepository<VariantAxis, UUID> {
    fun findByCode(code: String): VariantAxis?
    fun findByIsActiveOrderByPositionAsc(isActive: Boolean): List<VariantAxis>
    fun findAllByOrderByPositionAsc(): List<VariantAxis>
    fun existsByCode(code: String): Boolean
    fun findByAttributeId(attributeId: UUID): VariantAxis?
}

@Repository
interface ProductVariantConfigRepository : JpaRepository<ProductVariantConfig, UUID> {
    fun findByProductId(productId: UUID): ProductVariantConfig?
    fun existsByProductId(productId: UUID): Boolean
    fun deleteByProductId(productId: UUID)
}

@Repository
interface VariantAttributeValueRepository : JpaRepository<VariantAttributeValue, UUID> {
    fun findByVariantId(variantId: UUID): List<VariantAttributeValue>
    fun findByVariantIdAndAxisId(variantId: UUID, axisId: UUID): VariantAttributeValue?
    fun deleteByVariantId(variantId: UUID)

    @Query("SELECT vav FROM VariantAttributeValue vav WHERE vav.axisId = :axisId")
    fun findByAxisId(@Param("axisId") axisId: UUID): List<VariantAttributeValue>

    @Query("""
        SELECT DISTINCT vav.value FROM VariantAttributeValue vav
        JOIN Product p ON p.id = vav.variantId
        WHERE p.parent.id = :parentId AND vav.axisId = :axisId
    """)
    fun findDistinctValuesByParentAndAxis(
        @Param("parentId") parentId: UUID,
        @Param("axisId") axisId: UUID
    ): List<String>
}
