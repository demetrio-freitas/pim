package com.pim.infrastructure.persistence

import com.pim.domain.product.CompletenessRule
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface CompletenessRuleRepository : JpaRepository<CompletenessRule, UUID> {

    fun findByIsActiveTrue(): List<CompletenessRule>

    fun findByCategoryIdIsNullAndIsActiveTrue(): List<CompletenessRule>

    fun findByCategoryIdAndIsActiveTrue(categoryId: UUID): List<CompletenessRule>

    @Query("""
        SELECT r FROM CompletenessRule r
        WHERE r.isActive = true
        AND (r.categoryId IS NULL OR r.categoryId = :categoryId)
        ORDER BY r.isRequired DESC, r.weight DESC
    """)
    fun findRulesForCategory(categoryId: UUID?): List<CompletenessRule>

    fun existsByFieldAndCategoryIdIsNull(field: String): Boolean

    fun existsByFieldAndCategoryId(field: String, categoryId: UUID): Boolean
}
