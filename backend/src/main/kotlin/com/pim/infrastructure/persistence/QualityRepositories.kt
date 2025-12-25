package com.pim.infrastructure.persistence

import com.pim.domain.quality.*
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.*

@Repository
interface DataQualityRuleRepository : JpaRepository<DataQualityRule, UUID> {
    fun findByCode(code: String): DataQualityRule?
    fun existsByCode(code: String): Boolean
    fun findByIsActiveOrderByPositionAsc(isActive: Boolean): List<DataQualityRule>
    fun findAllByOrderByPositionAsc(): List<DataQualityRule>
    fun findByType(type: QualityRuleType): List<DataQualityRule>
    fun findBySeverity(severity: RuleSeverity): List<DataQualityRule>

    @Query("""
        SELECT r FROM DataQualityRule r
        WHERE r.isActive = true
        AND (r.categoryId IS NULL OR r.categoryId = :categoryId)
        AND (r.familyId IS NULL OR r.familyId = :familyId)
        ORDER BY r.position
    """)
    fun findApplicableRules(
        @Param("categoryId") categoryId: UUID?,
        @Param("familyId") familyId: UUID?
    ): List<DataQualityRule>

    @Query("""
        SELECT r FROM DataQualityRule r
        WHERE r.isActive = true
        AND (r.attributeId = :attributeId OR r.attributeId IS NULL)
        ORDER BY r.position
    """)
    fun findRulesForAttribute(@Param("attributeId") attributeId: UUID): List<DataQualityRule>

    @Query("SELECT r FROM DataQualityRule r WHERE r.isActive = true AND r.channelId = :channelId ORDER BY r.position")
    fun findByChannelId(@Param("channelId") channelId: UUID): List<DataQualityRule>
}

@Repository
interface QualityValidationLogRepository : JpaRepository<QualityValidationLog, UUID> {
    fun findByProductIdOrderByCreatedAtDesc(productId: UUID, pageable: Pageable): Page<QualityValidationLog>

    @Query("SELECT l FROM QualityValidationLog l WHERE l.createdAt > :since ORDER BY l.createdAt DESC")
    fun findRecentLogs(@Param("since") since: Instant, pageable: Pageable): Page<QualityValidationLog>

    @Query("SELECT AVG(l.overallScore) FROM QualityValidationLog l WHERE l.createdAt > :since")
    fun getAverageScore(@Param("since") since: Instant): Double?

    @Query("""
        SELECT l FROM QualityValidationLog l
        WHERE l.productId = :productId
        ORDER BY l.createdAt DESC
        LIMIT 1
    """)
    fun findLatestByProductId(@Param("productId") productId: UUID): QualityValidationLog?
}
