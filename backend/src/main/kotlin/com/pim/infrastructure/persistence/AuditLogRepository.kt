package com.pim.infrastructure.persistence

import com.pim.domain.audit.AuditAction
import com.pim.domain.audit.AuditLog
import com.pim.domain.audit.EntityType
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.UUID

@Repository
interface AuditLogRepository : JpaRepository<AuditLog, UUID> {

    fun findByEntityTypeAndEntityIdOrderByCreatedAtDesc(
        entityType: EntityType,
        entityId: UUID,
        pageable: Pageable
    ): Page<AuditLog>

    fun findByEntityTypeOrderByCreatedAtDesc(
        entityType: EntityType,
        pageable: Pageable
    ): Page<AuditLog>

    fun findByUserIdOrderByCreatedAtDesc(
        userId: UUID,
        pageable: Pageable
    ): Page<AuditLog>

    fun findByActionOrderByCreatedAtDesc(
        action: AuditAction,
        pageable: Pageable
    ): Page<AuditLog>

    @Query("""
        SELECT a FROM AuditLog a
        WHERE a.createdAt >= :since
        ORDER BY a.createdAt DESC
    """)
    fun findRecentLogs(since: Instant, pageable: Pageable): Page<AuditLog>

    @Query("""
        SELECT a FROM AuditLog a
        WHERE (:entityType IS NULL OR a.entityType = :entityType)
        AND (:action IS NULL OR a.action = :action)
        AND (:userId IS NULL OR a.userId = :userId)
        AND (:startDate IS NULL OR a.createdAt >= :startDate)
        AND (:endDate IS NULL OR a.createdAt <= :endDate)
        ORDER BY a.createdAt DESC
    """)
    fun findByFilters(
        entityType: EntityType?,
        action: AuditAction?,
        userId: UUID?,
        startDate: Instant?,
        endDate: Instant?,
        pageable: Pageable
    ): Page<AuditLog>

    @Query("""
        SELECT COUNT(a) FROM AuditLog a
        WHERE a.createdAt >= :since
    """)
    fun countRecentLogs(since: Instant): Long

    @Query("""
        SELECT a.action, COUNT(a) FROM AuditLog a
        WHERE a.createdAt >= :since
        GROUP BY a.action
    """)
    fun countByActionSince(since: Instant): List<Array<Any>>

    @Query("""
        SELECT DATE(a.createdAt), COUNT(a) FROM AuditLog a
        WHERE a.createdAt >= :since
        GROUP BY DATE(a.createdAt)
        ORDER BY DATE(a.createdAt)
    """)
    fun countByDaySince(since: Instant): List<Array<Any>>
}
