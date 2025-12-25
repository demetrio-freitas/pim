package com.pim.application

import com.fasterxml.jackson.databind.ObjectMapper
import com.pim.domain.audit.AuditAction
import com.pim.domain.audit.AuditLog
import com.pim.domain.audit.EntityType
import com.pim.domain.user.User
import com.pim.infrastructure.persistence.AuditLogRepository
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID

data class AuditChange(
    val field: String,
    val oldValue: Any?,
    val newValue: Any?
)

data class AuditContext(
    val user: User? = null,
    val ipAddress: String? = null,
    val userAgent: String? = null
)

data class AuditStats(
    val totalLogs: Long,
    val createCount: Long,
    val updateCount: Long,
    val deleteCount: Long,
    val byDay: List<DayCount>
)

data class DayCount(
    val date: String,
    val count: Long
)

@Service
@Transactional
class AuditService(
    private val auditLogRepository: AuditLogRepository,
    private val objectMapper: ObjectMapper
) {

    fun log(
        entityType: EntityType,
        entityId: UUID,
        action: AuditAction,
        entityName: String? = null,
        changes: List<AuditChange>? = null,
        metadata: Map<String, Any>? = null,
        context: AuditContext? = null
    ): AuditLog {
        val changesJson = changes?.let { objectMapper.writeValueAsString(it) }
        val metadataJson = metadata?.let { objectMapper.writeValueAsString(it) }

        val log = AuditLog(
            entityType = entityType,
            entityId = entityId,
            entityName = entityName,
            action = action,
            userId = context?.user?.id,
            userName = context?.user?.fullName,
            userEmail = context?.user?.email,
            changes = changesJson,
            metadata = metadataJson,
            ipAddress = context?.ipAddress,
            userAgent = context?.userAgent
        )

        return auditLogRepository.save(log)
    }

    fun logCreate(
        entityType: EntityType,
        entityId: UUID,
        entityName: String? = null,
        context: AuditContext? = null
    ) = log(entityType, entityId, AuditAction.CREATE, entityName, null, null, context)

    fun logUpdate(
        entityType: EntityType,
        entityId: UUID,
        entityName: String? = null,
        changes: List<AuditChange>,
        context: AuditContext? = null
    ) = log(entityType, entityId, AuditAction.UPDATE, entityName, changes, null, context)

    fun logDelete(
        entityType: EntityType,
        entityId: UUID,
        entityName: String? = null,
        context: AuditContext? = null
    ) = log(entityType, entityId, AuditAction.DELETE, entityName, null, null, context)

    // Query methods

    fun getEntityHistory(
        entityType: EntityType,
        entityId: UUID,
        pageable: Pageable
    ): Page<AuditLog> {
        return auditLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc(entityType, entityId, pageable)
    }

    fun getLogsByEntityType(entityType: EntityType, pageable: Pageable): Page<AuditLog> {
        return auditLogRepository.findByEntityTypeOrderByCreatedAtDesc(entityType, pageable)
    }

    fun getLogsByUser(userId: UUID, pageable: Pageable): Page<AuditLog> {
        return auditLogRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
    }

    fun getLogsByAction(action: AuditAction, pageable: Pageable): Page<AuditLog> {
        return auditLogRepository.findByActionOrderByCreatedAtDesc(action, pageable)
    }

    fun getRecentLogs(days: Int = 7, pageable: Pageable): Page<AuditLog> {
        val since = Instant.now().minus(days.toLong(), ChronoUnit.DAYS)
        return auditLogRepository.findRecentLogs(since, pageable)
    }

    fun searchLogs(
        entityType: EntityType? = null,
        action: AuditAction? = null,
        userId: UUID? = null,
        startDate: Instant? = null,
        endDate: Instant? = null,
        pageable: Pageable
    ): Page<AuditLog> {
        return auditLogRepository.findByFilters(entityType, action, userId, startDate, endDate, pageable)
    }

    fun getStats(days: Int = 30): AuditStats {
        val since = Instant.now().minus(days.toLong(), ChronoUnit.DAYS)
        val totalLogs = auditLogRepository.countRecentLogs(since)

        val actionCounts = auditLogRepository.countByActionSince(since)
            .associate { (it[0] as AuditAction) to (it[1] as Long) }

        val byDay = auditLogRepository.countByDaySince(since)
            .map { DayCount(it[0].toString(), it[1] as Long) }

        return AuditStats(
            totalLogs = totalLogs,
            createCount = actionCounts[AuditAction.CREATE] ?: 0,
            updateCount = actionCounts[AuditAction.UPDATE] ?: 0,
            deleteCount = actionCounts[AuditAction.DELETE] ?: 0,
            byDay = byDay
        )
    }

    // Utility to calculate changes between two objects
    fun <T> calculateChanges(old: T?, new: T, fields: List<String>, getField: (T, String) -> Any?): List<AuditChange> {
        if (old == null) return emptyList()

        return fields.mapNotNull { field ->
            val oldValue = getField(old, field)
            val newValue = getField(new, field)
            if (oldValue != newValue) {
                AuditChange(field, oldValue, newValue)
            } else null
        }
    }
}
