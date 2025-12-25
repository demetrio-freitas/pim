package com.pim.domain.workflow

import com.pim.domain.product.Product
import com.pim.domain.user.User
import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

enum class WorkflowStatus {
    PENDING,
    APPROVED,
    REJECTED,
    CANCELLED
}

enum class WorkflowAction {
    PUBLISH,
    UNPUBLISH,
    DELETE,
    BULK_UPDATE,
    PRICE_CHANGE
}

@Entity
@Table(name = "workflow_requests")
data class WorkflowRequest(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID = UUID.randomUUID(),

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    val action: WorkflowAction,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: WorkflowStatus = WorkflowStatus.PENDING,

    @Column(nullable = false)
    val title: String,

    @Column(columnDefinition = "TEXT")
    val description: String? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requester_id", nullable = false)
    val requester: User,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewer_id")
    var reviewer: User? = null,

    @Column(columnDefinition = "TEXT")
    var reviewComment: String? = null,

    @Column
    var reviewedAt: Instant? = null,

    @Column(columnDefinition = "TEXT")
    val metadata: String? = null, // JSON with affected product IDs, changes, etc.

    @Column(nullable = false)
    val createdAt: Instant = Instant.now(),

    @Column(nullable = false)
    var updatedAt: Instant = Instant.now()
)

@Entity
@Table(name = "workflow_notifications")
data class WorkflowNotification(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_request_id")
    val workflowRequest: WorkflowRequest? = null,

    @Column(nullable = false)
    val title: String,

    @Column(nullable = false)
    val message: String,

    @Column(nullable = false)
    val type: String = "workflow", // workflow, system, alert

    @Column(nullable = false)
    var isRead: Boolean = false,

    @Column
    val link: String? = null,

    @Column(nullable = false)
    val createdAt: Instant = Instant.now()
)
