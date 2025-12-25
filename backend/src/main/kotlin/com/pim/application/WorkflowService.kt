package com.pim.application

import com.pim.domain.user.User
import com.pim.domain.workflow.*
import com.pim.infrastructure.persistence.NotificationRepository
import com.pim.infrastructure.persistence.UserRepository
import com.pim.infrastructure.persistence.WorkflowRequestRepository
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

data class CreateWorkflowRequest(
    val action: WorkflowAction,
    val title: String,
    val description: String?,
    val metadata: String?
)

data class ReviewWorkflowRequest(
    val approved: Boolean,
    val comment: String?
)

@Service
@Transactional
class WorkflowService(
    private val workflowRequestRepository: WorkflowRequestRepository,
    private val notificationRepository: NotificationRepository,
    private val userRepository: UserRepository
) {

    fun createRequest(dto: CreateWorkflowRequest, requester: User): WorkflowRequest {
        val request = WorkflowRequest(
            action = dto.action,
            title = dto.title,
            description = dto.description,
            metadata = dto.metadata,
            requester = requester
        )

        val saved = workflowRequestRepository.save(request)

        // Notify admins about new request
        notifyAdmins(
            title = "Nova Solicitação de Aprovação",
            message = "${requester.fullName} solicitou aprovação para: ${dto.title}",
            request = saved
        )

        return saved
    }

    fun reviewRequest(id: UUID, dto: ReviewWorkflowRequest, reviewer: User): WorkflowRequest {
        val request = workflowRequestRepository.findById(id)
            .orElseThrow { IllegalArgumentException("Request not found") }

        if (request.status != WorkflowStatus.PENDING) {
            throw IllegalStateException("Request has already been reviewed")
        }

        request.status = if (dto.approved) WorkflowStatus.APPROVED else WorkflowStatus.REJECTED
        request.reviewer = reviewer
        request.reviewComment = dto.comment
        request.reviewedAt = Instant.now()
        request.updatedAt = Instant.now()

        val saved = workflowRequestRepository.save(request)

        // Notify requester about decision
        val statusText = if (dto.approved) "aprovada" else "rejeitada"
        createNotification(
            user = request.requester,
            title = "Solicitação $statusText",
            message = "Sua solicitação '${request.title}' foi $statusText por ${reviewer.fullName}",
            request = saved
        )

        return saved
    }

    fun cancelRequest(id: UUID, user: User): WorkflowRequest {
        val request = workflowRequestRepository.findById(id)
            .orElseThrow { IllegalArgumentException("Request not found") }

        if (request.requester.id != user.id) {
            throw IllegalAccessException("Only the requester can cancel the request")
        }

        if (request.status != WorkflowStatus.PENDING) {
            throw IllegalStateException("Only pending requests can be cancelled")
        }

        request.status = WorkflowStatus.CANCELLED
        request.updatedAt = Instant.now()

        return workflowRequestRepository.save(request)
    }

    fun getPendingRequests(pageable: Pageable): Page<WorkflowRequest> {
        return workflowRequestRepository.findPendingRequests(pageable = pageable)
    }

    fun getMyRequests(userId: UUID, pageable: Pageable): Page<WorkflowRequest> {
        return workflowRequestRepository.findByRequesterId(userId, pageable)
    }

    fun getRequest(id: UUID): WorkflowRequest {
        return workflowRequestRepository.findById(id)
            .orElseThrow { IllegalArgumentException("Request not found") }
    }

    fun getPendingCount(): Long {
        return workflowRequestRepository.countByStatus(WorkflowStatus.PENDING)
    }

    // Notifications

    fun getNotifications(userId: UUID, pageable: Pageable): Page<WorkflowNotification> {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
    }

    fun getUnreadNotifications(userId: UUID): List<WorkflowNotification> {
        return notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId)
    }

    fun getUnreadCount(userId: UUID): Long {
        return notificationRepository.countByUserIdAndIsReadFalse(userId)
    }

    fun markAsRead(notificationId: UUID): WorkflowNotification {
        val notification = notificationRepository.findById(notificationId)
            .orElseThrow { IllegalArgumentException("Notification not found") }
        notification.isRead = true
        return notificationRepository.save(notification)
    }

    fun markAllAsRead(userId: UUID) {
        val unread = notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId)
        unread.forEach { it.isRead = true }
        notificationRepository.saveAll(unread)
    }

    private fun createNotification(
        user: User,
        title: String,
        message: String,
        request: WorkflowRequest? = null,
        type: String = "workflow",
        link: String? = null
    ): WorkflowNotification {
        val notification = WorkflowNotification(
            user = user,
            title = title,
            message = message,
            workflowRequest = request,
            type = type,
            link = link ?: request?.let { "/workflow/${it.id}" }
        )
        return notificationRepository.save(notification)
    }

    private fun notifyAdmins(title: String, message: String, request: WorkflowRequest) {
        val admins = userRepository.findByRoleName("ADMIN")
        admins.forEach { admin ->
            if (admin.id != request.requester.id) {
                createNotification(
                    user = admin,
                    title = title,
                    message = message,
                    request = request
                )
            }
        }
    }
}
