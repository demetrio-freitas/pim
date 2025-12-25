package com.pim.infrastructure.web

import com.pim.application.CreateWorkflowRequest
import com.pim.application.ReviewWorkflowRequest
import com.pim.application.WorkflowService
import com.pim.domain.user.User
import com.pim.domain.workflow.WorkflowNotification
import com.pim.domain.workflow.WorkflowRequest
import com.pim.infrastructure.persistence.UserRepository
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/workflow")
class WorkflowController(
    private val workflowService: WorkflowService,
    private val userRepository: UserRepository
) {

    private fun getUser(userDetails: UserDetails): User {
        return userRepository.findByEmail(userDetails.username)
            ?: throw IllegalArgumentException("User not found")
    }

    @PostMapping("/requests")
    @PreAuthorize("hasAuthority('products.write')")
    fun createRequest(
        @RequestBody dto: CreateWorkflowRequest,
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<WorkflowRequest> {
        val user = getUser(userDetails)
        return ResponseEntity.ok(workflowService.createRequest(dto, user))
    }

    @GetMapping("/requests/pending")
    @PreAuthorize("hasAnyAuthority('workflow.approve', 'ROLE_ADMIN')")
    fun getPendingRequests(pageable: Pageable): ResponseEntity<Page<WorkflowRequest>> {
        return ResponseEntity.ok(workflowService.getPendingRequests(pageable))
    }

    @GetMapping("/requests/my")
    fun getMyRequests(
        @AuthenticationPrincipal userDetails: UserDetails,
        pageable: Pageable
    ): ResponseEntity<Page<WorkflowRequest>> {
        val user = getUser(userDetails)
        return ResponseEntity.ok(workflowService.getMyRequests(user.id, pageable))
    }

    @GetMapping("/requests/{id}")
    fun getRequest(@PathVariable id: UUID): ResponseEntity<WorkflowRequest> {
        return ResponseEntity.ok(workflowService.getRequest(id))
    }

    @PostMapping("/requests/{id}/review")
    @PreAuthorize("hasAnyAuthority('workflow.approve', 'ROLE_ADMIN')")
    fun reviewRequest(
        @PathVariable id: UUID,
        @RequestBody dto: ReviewWorkflowRequest,
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<WorkflowRequest> {
        val user = getUser(userDetails)
        return ResponseEntity.ok(workflowService.reviewRequest(id, dto, user))
    }

    @PostMapping("/requests/{id}/cancel")
    fun cancelRequest(
        @PathVariable id: UUID,
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<WorkflowRequest> {
        val user = getUser(userDetails)
        return ResponseEntity.ok(workflowService.cancelRequest(id, user))
    }

    @GetMapping("/requests/pending/count")
    fun getPendingCount(): ResponseEntity<Map<String, Long>> {
        return ResponseEntity.ok(mapOf("count" to workflowService.getPendingCount()))
    }

    // Notifications
    @GetMapping("/notifications")
    fun getNotifications(
        @AuthenticationPrincipal userDetails: UserDetails,
        pageable: Pageable
    ): ResponseEntity<Page<WorkflowNotification>> {
        val user = getUser(userDetails)
        return ResponseEntity.ok(workflowService.getNotifications(user.id, pageable))
    }

    @GetMapping("/notifications/unread")
    fun getUnreadNotifications(
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<List<WorkflowNotification>> {
        val user = getUser(userDetails)
        return ResponseEntity.ok(workflowService.getUnreadNotifications(user.id))
    }

    @GetMapping("/notifications/unread/count")
    fun getUnreadCount(
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<Map<String, Long>> {
        val user = getUser(userDetails)
        return ResponseEntity.ok(mapOf("count" to workflowService.getUnreadCount(user.id)))
    }

    @PatchMapping("/notifications/{id}/read")
    fun markAsRead(@PathVariable id: UUID): ResponseEntity<WorkflowNotification> {
        return ResponseEntity.ok(workflowService.markAsRead(id))
    }

    @PostMapping("/notifications/read-all")
    fun markAllAsRead(
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<Map<String, String>> {
        val user = getUser(userDetails)
        workflowService.markAllAsRead(user.id)
        return ResponseEntity.ok(mapOf("message" to "All notifications marked as read"))
    }
}
