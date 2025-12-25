package com.pim.infrastructure.persistence

import com.pim.domain.workflow.WorkflowNotification
import com.pim.domain.workflow.WorkflowRequest
import com.pim.domain.workflow.WorkflowStatus
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface WorkflowRequestRepository : JpaRepository<WorkflowRequest, UUID> {

    fun findByStatus(status: WorkflowStatus, pageable: Pageable): Page<WorkflowRequest>

    fun findByRequesterId(requesterId: UUID, pageable: Pageable): Page<WorkflowRequest>

    fun findByReviewerId(reviewerId: UUID, pageable: Pageable): Page<WorkflowRequest>

    fun countByStatus(status: WorkflowStatus): Long

    @Query("""
        SELECT w FROM WorkflowRequest w
        WHERE w.status = :status
        ORDER BY w.createdAt DESC
    """)
    fun findPendingRequests(status: WorkflowStatus = WorkflowStatus.PENDING, pageable: Pageable): Page<WorkflowRequest>
}

@Repository
interface NotificationRepository : JpaRepository<WorkflowNotification, UUID> {

    fun findByUserIdOrderByCreatedAtDesc(userId: UUID, pageable: Pageable): Page<WorkflowNotification>

    fun findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId: UUID): List<WorkflowNotification>

    fun countByUserIdAndIsReadFalse(userId: UUID): Long

    @Query("UPDATE WorkflowNotification n SET n.isRead = true WHERE n.user.id = :userId")
    fun markAllAsRead(userId: UUID)
}
