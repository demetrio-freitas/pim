package com.pim.infrastructure.web

import com.pim.application.*
import com.pim.domain.integration.WebhookEvent
import com.pim.domain.user.User
import com.pim.infrastructure.persistence.UserRepository
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PageableDefault
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.web.bind.annotation.*
import java.util.*

// ==================== API KEYS ====================

@RestController
@RequestMapping("/api/integration/api-keys")
@Tag(name = "API Keys", description = "API Key management")
class ApiKeyController(
    private val apiKeyService: ApiKeyService,
    private val userRepository: UserRepository
) {
    private fun getUser(userDetails: UserDetails): User? {
        return userRepository.findByEmail(userDetails.username)
    }

    @PostMapping
    @Operation(summary = "Create a new API key")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun create(
        @RequestBody request: ApiKeyCreateRequest,
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<ApiKeyCreatedResponse> {
        val user = getUser(userDetails)
        val created = apiKeyService.create(request, user?.id)
        return ResponseEntity.status(HttpStatus.CREATED).body(created)
    }

    @GetMapping
    @Operation(summary = "List all API keys")
    @PreAuthorize("hasAuthority('settings.view')")
    fun list(
        @PageableDefault(size = 20) pageable: Pageable
    ): ResponseEntity<Page<ApiKeyResponse>> {
        return ResponseEntity.ok(apiKeyService.getAll(pageable))
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get API key by ID")
    @PreAuthorize("hasAuthority('settings.view')")
    fun getById(@PathVariable id: UUID): ResponseEntity<ApiKeyResponse> {
        val apiKey = apiKeyService.getById(id)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(apiKey)
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update API key")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun update(
        @PathVariable id: UUID,
        @RequestBody request: ApiKeyUpdateRequest
    ): ResponseEntity<ApiKeyResponse> {
        val updated = apiKeyService.update(id, request)
        return ResponseEntity.ok(updated)
    }

    @PostMapping("/{id}/revoke")
    @Operation(summary = "Revoke API key")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun revoke(@PathVariable id: UUID): ResponseEntity<ApiKeyResponse> {
        val revoked = apiKeyService.revoke(id)
        return ResponseEntity.ok(revoked)
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete API key")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun delete(@PathVariable id: UUID): ResponseEntity<Void> {
        apiKeyService.delete(id)
        return ResponseEntity.noContent().build()
    }

    @GetMapping("/permissions")
    @Operation(summary = "Get available permissions")
    @PreAuthorize("hasAuthority('settings.view')")
    fun getPermissions(): ResponseEntity<List<Map<String, String>>> {
        return ResponseEntity.ok(apiKeyService.getAvailablePermissions())
    }
}

// ==================== WEBHOOKS ====================

@RestController
@RequestMapping("/api/integration/webhooks")
@Tag(name = "Webhooks", description = "Webhook management")
class WebhookController(
    private val webhookService: WebhookService,
    private val userRepository: UserRepository
) {
    private fun getUser(userDetails: UserDetails): User? {
        return userRepository.findByEmail(userDetails.username)
    }

    @PostMapping
    @Operation(summary = "Create a new webhook")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun create(
        @RequestBody request: WebhookCreateRequest,
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<WebhookResponse> {
        val user = getUser(userDetails)
        val created = webhookService.create(request, user?.id)
        return ResponseEntity.status(HttpStatus.CREATED).body(created)
    }

    @GetMapping
    @Operation(summary = "List all webhooks")
    @PreAuthorize("hasAuthority('settings.view')")
    fun list(
        @PageableDefault(size = 20) pageable: Pageable
    ): ResponseEntity<Page<WebhookResponse>> {
        return ResponseEntity.ok(webhookService.getAll(pageable))
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get webhook by ID")
    @PreAuthorize("hasAuthority('settings.view')")
    fun getById(@PathVariable id: UUID): ResponseEntity<WebhookResponse> {
        val webhook = webhookService.getById(id)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(webhook)
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update webhook")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun update(
        @PathVariable id: UUID,
        @RequestBody request: WebhookUpdateRequest
    ): ResponseEntity<WebhookResponse> {
        val updated = webhookService.update(id, request)
        return ResponseEntity.ok(updated)
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete webhook")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun delete(@PathVariable id: UUID): ResponseEntity<Void> {
        webhookService.delete(id)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/{id}/test")
    @Operation(summary = "Test webhook")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun test(@PathVariable id: UUID): ResponseEntity<WebhookLogResponse> {
        val result = webhookService.testWebhook(id)
        return ResponseEntity.ok(result)
    }

    @GetMapping("/{id}/logs")
    @Operation(summary = "Get webhook logs")
    @PreAuthorize("hasAuthority('settings.view')")
    fun getLogs(
        @PathVariable id: UUID,
        @PageableDefault(size = 50) pageable: Pageable
    ): ResponseEntity<Page<WebhookLogResponse>> {
        return ResponseEntity.ok(webhookService.getLogs(id, pageable))
    }

    @GetMapping("/events")
    @Operation(summary = "Get available events")
    @PreAuthorize("hasAuthority('settings.view')")
    fun getEvents(): ResponseEntity<List<Map<String, String>>> {
        return ResponseEntity.ok(webhookService.getAvailableEvents())
    }
}

// ==================== PUBLIC API (com API Key) ====================

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Public API", description = "Public API endpoints (API Key authentication)")
class PublicApiController(
    private val apiKeyService: ApiKeyService,
    private val webhookService: WebhookService
) {
    // Aqui seriam endpoints públicos acessíveis via API Key
    // A autenticação seria feita via filtro de API Key

    @GetMapping("/health")
    @Operation(summary = "API Health check")
    fun health(): ResponseEntity<Map<String, Any>> {
        return ResponseEntity.ok(mapOf(
            "status" to "ok",
            "version" to "1.0.0",
            "timestamp" to System.currentTimeMillis()
        ))
    }
}
