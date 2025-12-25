package com.pim.domain.audit

import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

enum class AuditAction {
    CREATE,
    UPDATE,
    DELETE,
    PUBLISH,
    UNPUBLISH,
    BULK_UPDATE,
    IMPORT,
    EXPORT
}

enum class EntityType {
    PRODUCT,
    CATEGORY,
    ATTRIBUTE,
    USER,
    MEDIA,
    SETTINGS
}

@Entity
@Table(name = "audit_logs", indexes = [
    Index(name = "idx_audit_entity", columnList = "entity_type,entity_id"),
    Index(name = "idx_audit_user", columnList = "user_id"),
    Index(name = "idx_audit_created", columnList = "created_at DESC")
])
data class AuditLog(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID = UUID.randomUUID(),

    @Enumerated(EnumType.STRING)
    @Column(name = "entity_type", nullable = false)
    val entityType: EntityType,

    @Column(name = "entity_id", nullable = false)
    val entityId: UUID,

    @Column(name = "entity_name")
    val entityName: String? = null, // For display purposes (e.g., product name)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    val action: AuditAction,

    @Column(name = "user_id")
    val userId: UUID? = null,

    @Column(name = "user_name")
    val userName: String? = null,

    @Column(name = "user_email")
    val userEmail: String? = null,

    @Column(columnDefinition = "TEXT")
    val changes: String? = null, // JSON with old and new values

    @Column(columnDefinition = "TEXT")
    val metadata: String? = null, // Additional context

    @Column(name = "ip_address")
    val ipAddress: String? = null,

    @Column(name = "user_agent")
    val userAgent: String? = null,

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now()
)
