package com.pim.infrastructure.web

import com.pim.application.AuditService
import com.pim.application.AuditStats
import com.pim.domain.audit.AuditAction
import com.pim.domain.audit.AuditLog
import com.pim.domain.audit.EntityType
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*
import java.time.Instant
import java.util.UUID

@RestController
@RequestMapping("/api/audit")
@PreAuthorize("hasAnyAuthority('settings.read', 'ROLE_ADMIN')")
class AuditController(
    private val auditService: AuditService
) {

    @GetMapping
    fun getLogs(
        @RequestParam entityType: EntityType?,
        @RequestParam action: AuditAction?,
        @RequestParam userId: UUID?,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) startDate: Instant?,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) endDate: Instant?,
        pageable: Pageable
    ): ResponseEntity<Page<AuditLog>> {
        return ResponseEntity.ok(
            auditService.searchLogs(entityType, action, userId, startDate, endDate, pageable)
        )
    }

    @GetMapping("/recent")
    fun getRecentLogs(
        @RequestParam(defaultValue = "7") days: Int,
        pageable: Pageable
    ): ResponseEntity<Page<AuditLog>> {
        return ResponseEntity.ok(auditService.getRecentLogs(days, pageable))
    }

    @GetMapping("/entity/{entityType}/{entityId}")
    fun getEntityHistory(
        @PathVariable entityType: EntityType,
        @PathVariable entityId: UUID,
        pageable: Pageable
    ): ResponseEntity<Page<AuditLog>> {
        return ResponseEntity.ok(auditService.getEntityHistory(entityType, entityId, pageable))
    }

    @GetMapping("/user/{userId}")
    fun getUserActivity(
        @PathVariable userId: UUID,
        pageable: Pageable
    ): ResponseEntity<Page<AuditLog>> {
        return ResponseEntity.ok(auditService.getLogsByUser(userId, pageable))
    }

    @GetMapping("/stats")
    fun getStats(
        @RequestParam(defaultValue = "30") days: Int
    ): ResponseEntity<AuditStats> {
        return ResponseEntity.ok(auditService.getStats(days))
    }
}

// Product-specific audit endpoint
@RestController
@RequestMapping("/api/products/{productId}/history")
@PreAuthorize("hasAuthority('products.read')")
class ProductAuditController(
    private val auditService: AuditService
) {

    @GetMapping
    fun getProductHistory(
        @PathVariable productId: UUID,
        pageable: Pageable
    ): ResponseEntity<Page<AuditLog>> {
        return ResponseEntity.ok(
            auditService.getEntityHistory(EntityType.PRODUCT, productId, pageable)
        )
    }
}
