package com.pim.application

import com.fasterxml.jackson.databind.ObjectMapper
import com.pim.config.security.UrlSecurityValidator
import com.pim.domain.integration.*
import com.pim.infrastructure.persistence.WebhookLogRepository
import com.pim.infrastructure.persistence.WebhookRepository
import org.slf4j.LoggerFactory
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpMethod
import org.springframework.http.MediaType
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.client.RestTemplate
import java.time.Instant
import java.util.*
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

data class WebhookCreateRequest(
    val name: String,
    val url: String,
    val description: String? = null,
    val events: Set<WebhookEvent>,
    val secretKey: String? = null,
    val retryCount: Int = 3,
    val timeoutSeconds: Int = 30,
    val customHeaders: Map<String, String> = emptyMap()
)

data class WebhookUpdateRequest(
    val name: String? = null,
    val url: String? = null,
    val description: String? = null,
    val events: Set<WebhookEvent>? = null,
    val secretKey: String? = null,
    val retryCount: Int? = null,
    val timeoutSeconds: Int? = null,
    val customHeaders: Map<String, String>? = null,
    val status: WebhookStatus? = null
)

data class WebhookResponse(
    val id: UUID,
    val name: String,
    val url: String,
    val description: String?,
    val status: WebhookStatus,
    val events: Set<WebhookEvent>,
    val hasSecret: Boolean,
    val retryCount: Int,
    val timeoutSeconds: Int,
    val customHeaders: Map<String, String>,
    val lastTriggeredAt: Instant?,
    val lastStatusCode: Int?,
    val successCount: Long,
    val failureCount: Long,
    val createdAt: Instant
)

data class WebhookLogResponse(
    val id: UUID,
    val webhookId: UUID,
    val event: WebhookEvent,
    val entityId: UUID?,
    val entityType: String?,
    val responseStatus: Int?,
    val success: Boolean,
    val errorMessage: String?,
    val attemptCount: Int,
    val durationMs: Long?,
    val createdAt: Instant
)

data class WebhookPayload(
    val event: WebhookEvent,
    val timestamp: Instant,
    val entityType: String?,
    val entityId: UUID?,
    val data: Any?
)

@Service
@Transactional
class WebhookService(
    private val webhookRepository: WebhookRepository,
    private val webhookLogRepository: WebhookLogRepository,
    private val objectMapper: ObjectMapper,
    private val urlSecurityValidator: UrlSecurityValidator
) {
    private val logger = LoggerFactory.getLogger(WebhookService::class.java)
    private val restTemplate = RestTemplate()

    fun create(request: WebhookCreateRequest, createdBy: UUID?): WebhookResponse {
        // SECURITY: Validate webhook URL to prevent SSRF attacks
        try {
            urlSecurityValidator.validateUrl(request.url)
        } catch (e: SecurityException) {
            logger.warn("Webhook URL validation failed: ${e.message} - URL: ${request.url}")
            throw IllegalArgumentException("Invalid webhook URL: ${e.message}")
        }

        // SECURITY: Validate custom headers for injection attacks
        request.customHeaders.forEach { (key, value) ->
            validateHeader(key, value)
        }

        val webhook = Webhook(
            name = request.name,
            url = request.url,
            description = request.description,
            events = request.events.toMutableSet(),
            secretKey = request.secretKey,
            retryCount = request.retryCount,
            timeoutSeconds = request.timeoutSeconds,
            customHeaders = request.customHeaders.toMutableMap(),
            createdBy = createdBy
        )

        val saved = webhookRepository.save(webhook)
        return saved.toResponse()
    }

    fun update(id: UUID, request: WebhookUpdateRequest): WebhookResponse {
        val webhook = webhookRepository.findById(id)
            .orElseThrow { IllegalArgumentException("Webhook não encontrado") }

        // SECURITY: Validate new webhook URL if provided
        request.url?.let { url ->
            try {
                urlSecurityValidator.validateUrl(url)
            } catch (e: SecurityException) {
                logger.warn("Webhook URL validation failed on update: ${e.message} - URL: $url")
                throw IllegalArgumentException("Invalid webhook URL: ${e.message}")
            }
        }

        // SECURITY: Validate custom headers if provided
        request.customHeaders?.forEach { (key, value) ->
            validateHeader(key, value)
        }

        request.name?.let { webhook.name = it }
        request.url?.let { webhook.url = it }
        request.description?.let { webhook.description = it }
        request.events?.let { webhook.events = it.toMutableSet() }
        request.secretKey?.let { webhook.secretKey = it }
        request.retryCount?.let { webhook.retryCount = it }
        request.timeoutSeconds?.let { webhook.timeoutSeconds = it }
        request.customHeaders?.let { webhook.customHeaders = it.toMutableMap() }
        request.status?.let { webhook.status = it }
        webhook.updatedAt = Instant.now()

        val saved = webhookRepository.save(webhook)
        return saved.toResponse()
    }

    fun delete(id: UUID) {
        webhookRepository.deleteById(id)
    }

    fun getById(id: UUID): WebhookResponse? {
        return webhookRepository.findById(id).orElse(null)?.toResponse()
    }

    fun getAll(pageable: Pageable): Page<WebhookResponse> {
        return webhookRepository.findAllByOrderByCreatedAtDesc(pageable)
            .map { it.toResponse() }
    }

    fun getLogs(webhookId: UUID, pageable: Pageable): Page<WebhookLogResponse> {
        return webhookLogRepository.findByWebhookIdOrderByCreatedAtDesc(webhookId, pageable)
            .map { it.toResponse() }
    }

    fun getAvailableEvents(): List<Map<String, String>> {
        return WebhookEvent.values().map {
            mapOf(
                "value" to it.name,
                "label" to it.toLabel(),
                "group" to it.toGroup()
            )
        }
    }

    @Async
    fun trigger(event: WebhookEvent, entityType: String?, entityId: UUID?, data: Any?) {
        val webhooks = webhookRepository.findByEventAndStatusActive(event)

        if (webhooks.isEmpty()) {
            logger.debug("No active webhooks for event: $event")
            return
        }

        val payload = WebhookPayload(
            event = event,
            timestamp = Instant.now(),
            entityType = entityType,
            entityId = entityId,
            data = data
        )

        val payloadJson = objectMapper.writeValueAsString(payload)

        webhooks.forEach { webhook ->
            triggerWebhook(webhook, event, entityType, entityId, payloadJson)
        }
    }

    private fun triggerWebhook(
        webhook: Webhook,
        event: WebhookEvent,
        entityType: String?,
        entityId: UUID?,
        payloadJson: String
    ) {
        val log = WebhookLog(
            webhookId = webhook.id,
            event = event,
            entityId = entityId,
            entityType = entityType,
            payload = payloadJson
        )

        var attempt = 0
        var success = false
        var lastError: String? = null
        var responseStatus: Int? = null
        var responseBody: String? = null
        var durationMs: Long? = null

        while (attempt < webhook.retryCount && !success) {
            attempt++
            val startTime = System.currentTimeMillis()

            try {
                val headers = HttpHeaders().apply {
                    contentType = MediaType.APPLICATION_JSON
                    set("X-Webhook-Event", event.name)
                    set("X-Webhook-Timestamp", Instant.now().toString())
                    set("X-Webhook-ID", webhook.id.toString())

                    // Assinatura HMAC
                    webhook.secretKey?.let { secret ->
                        val signature = generateSignature(payloadJson, secret)
                        set("X-Webhook-Signature", signature)
                    }

                    // Headers customizados
                    webhook.customHeaders.forEach { (key, value) ->
                        set(key, value)
                    }
                }

                val entity = HttpEntity(payloadJson, headers)
                val response = restTemplate.exchange(
                    webhook.url,
                    HttpMethod.POST,
                    entity,
                    String::class.java
                )

                responseStatus = response.statusCode.value()
                responseBody = response.body?.take(5000) // Limita tamanho
                success = response.statusCode.is2xxSuccessful
                durationMs = System.currentTimeMillis() - startTime

                if (!success) {
                    lastError = "HTTP ${response.statusCode}: ${response.body?.take(500)}"
                    logger.warn("Webhook failed for ${webhook.name}: $lastError")
                    Thread.sleep(1000L * attempt) // Backoff exponencial
                }
            } catch (e: Exception) {
                durationMs = System.currentTimeMillis() - startTime
                lastError = e.message?.take(500)
                logger.error("Webhook error for ${webhook.name}: ${e.message}")
                Thread.sleep(1000L * attempt)
            }
        }

        // Atualiza log
        log.attemptCount = attempt
        log.success = success
        log.responseStatus = responseStatus
        log.responseBody = responseBody
        log.errorMessage = lastError
        log.durationMs = durationMs
        webhookLogRepository.save(log)

        // Atualiza webhook stats
        webhook.lastTriggeredAt = Instant.now()
        webhook.lastStatusCode = responseStatus
        if (success) {
            webhook.successCount++
        } else {
            webhook.failureCount++
            // Pausa webhook após muitas falhas consecutivas
            if (webhook.failureCount > 10 && webhook.failureCount > webhook.successCount) {
                webhook.status = WebhookStatus.PAUSED
                logger.warn("Webhook ${webhook.name} paused due to too many failures")
            }
        }
        webhookRepository.save(webhook)
    }

    private fun generateSignature(payload: String, secret: String): String {
        val algorithm = "HmacSHA256"
        val mac = Mac.getInstance(algorithm)
        val secretKey = SecretKeySpec(secret.toByteArray(), algorithm)
        mac.init(secretKey)
        val hash = mac.doFinal(payload.toByteArray())
        return "sha256=" + hash.joinToString("") { "%02x".format(it) }
    }

    /**
     * SECURITY: Validate header key and value to prevent HTTP header injection
     */
    private fun validateHeader(key: String, value: String) {
        // Check for CRLF injection
        if (key.contains("\r") || key.contains("\n") || value.contains("\r") || value.contains("\n")) {
            throw IllegalArgumentException("Invalid header: CRLF characters not allowed")
        }

        // Check for null bytes
        if (key.contains('\u0000') || value.contains('\u0000')) {
            throw IllegalArgumentException("Invalid header: null bytes not allowed")
        }

        // Validate header name format (RFC 7230)
        if (!key.matches(Regex("^[!#$%&'*+\\-.^_`|~0-9A-Za-z]+$"))) {
            throw IllegalArgumentException("Invalid header name: $key")
        }

        // Check header value length
        if (value.length > 8192) {
            throw IllegalArgumentException("Header value too long: $key")
        }

        // Block sensitive headers that shouldn't be user-controlled
        val blockedHeaders = setOf("host", "content-length", "transfer-encoding", "connection", "cookie", "authorization")
        if (key.lowercase() in blockedHeaders) {
            throw IllegalArgumentException("Header not allowed: $key")
        }
    }

    fun testWebhook(id: UUID): WebhookLogResponse {
        val webhook = webhookRepository.findById(id)
            .orElseThrow { IllegalArgumentException("Webhook não encontrado") }

        val testPayload = WebhookPayload(
            event = WebhookEvent.PRODUCT_UPDATED,
            timestamp = Instant.now(),
            entityType = "test",
            entityId = UUID.randomUUID(),
            data = mapOf("test" to true, "message" to "This is a test webhook")
        )

        val payloadJson = objectMapper.writeValueAsString(testPayload)

        val log = WebhookLog(
            webhookId = webhook.id,
            event = WebhookEvent.PRODUCT_UPDATED,
            entityId = testPayload.entityId,
            entityType = "test",
            payload = payloadJson
        )

        val startTime = System.currentTimeMillis()

        try {
            val headers = HttpHeaders().apply {
                contentType = MediaType.APPLICATION_JSON
                set("X-Webhook-Event", "TEST")
                set("X-Webhook-Timestamp", Instant.now().toString())
                set("X-Webhook-ID", webhook.id.toString())
                set("X-Webhook-Test", "true")

                webhook.secretKey?.let { secret ->
                    val signature = generateSignature(payloadJson, secret)
                    set("X-Webhook-Signature", signature)
                }

                webhook.customHeaders.forEach { (key, value) ->
                    set(key, value)
                }
            }

            val entity = HttpEntity(payloadJson, headers)
            val response = restTemplate.exchange(
                webhook.url,
                HttpMethod.POST,
                entity,
                String::class.java
            )

            log.responseStatus = response.statusCode.value()
            log.responseBody = response.body?.take(5000)
            log.success = response.statusCode.is2xxSuccessful
            log.durationMs = System.currentTimeMillis() - startTime

        } catch (e: Exception) {
            log.errorMessage = e.message?.take(500)
            log.success = false
            log.durationMs = System.currentTimeMillis() - startTime
        }

        val saved = webhookLogRepository.save(log)
        return saved.toResponse()
    }

    private fun Webhook.toResponse() = WebhookResponse(
        id = id,
        name = name,
        url = url,
        description = description,
        status = status,
        events = events,
        hasSecret = !secretKey.isNullOrBlank(),
        retryCount = retryCount,
        timeoutSeconds = timeoutSeconds,
        customHeaders = customHeaders,
        lastTriggeredAt = lastTriggeredAt,
        lastStatusCode = lastStatusCode,
        successCount = successCount,
        failureCount = failureCount,
        createdAt = createdAt
    )

    private fun WebhookLog.toResponse() = WebhookLogResponse(
        id = id,
        webhookId = webhookId,
        event = event,
        entityId = entityId,
        entityType = entityType,
        responseStatus = responseStatus,
        success = success,
        errorMessage = errorMessage,
        attemptCount = attemptCount,
        durationMs = durationMs,
        createdAt = createdAt
    )

    private fun WebhookEvent.toLabel(): String = when (this) {
        WebhookEvent.PRODUCT_CREATED -> "Produto Criado"
        WebhookEvent.PRODUCT_UPDATED -> "Produto Atualizado"
        WebhookEvent.PRODUCT_DELETED -> "Produto Excluído"
        WebhookEvent.PRODUCT_PUBLISHED -> "Produto Publicado"
        WebhookEvent.PRODUCT_UNPUBLISHED -> "Produto Despublicado"
        WebhookEvent.CATEGORY_CREATED -> "Categoria Criada"
        WebhookEvent.CATEGORY_UPDATED -> "Categoria Atualizada"
        WebhookEvent.CATEGORY_DELETED -> "Categoria Excluída"
        WebhookEvent.ATTRIBUTE_CREATED -> "Atributo Criado"
        WebhookEvent.ATTRIBUTE_UPDATED -> "Atributo Atualizado"
        WebhookEvent.ATTRIBUTE_DELETED -> "Atributo Excluído"
        WebhookEvent.MEDIA_UPLOADED -> "Mídia Enviada"
        WebhookEvent.MEDIA_DELETED -> "Mídia Excluída"
        WebhookEvent.IMPORT_COMPLETED -> "Importação Concluída"
        WebhookEvent.EXPORT_COMPLETED -> "Exportação Concluída"
        WebhookEvent.WORKFLOW_APPROVED -> "Workflow Aprovado"
        WebhookEvent.WORKFLOW_REJECTED -> "Workflow Rejeitado"
    }

    private fun WebhookEvent.toGroup(): String = when (this) {
        WebhookEvent.PRODUCT_CREATED, WebhookEvent.PRODUCT_UPDATED, WebhookEvent.PRODUCT_DELETED,
        WebhookEvent.PRODUCT_PUBLISHED, WebhookEvent.PRODUCT_UNPUBLISHED -> "Produtos"
        WebhookEvent.CATEGORY_CREATED, WebhookEvent.CATEGORY_UPDATED, WebhookEvent.CATEGORY_DELETED -> "Categorias"
        WebhookEvent.ATTRIBUTE_CREATED, WebhookEvent.ATTRIBUTE_UPDATED, WebhookEvent.ATTRIBUTE_DELETED -> "Atributos"
        WebhookEvent.MEDIA_UPLOADED, WebhookEvent.MEDIA_DELETED -> "Mídia"
        WebhookEvent.IMPORT_COMPLETED, WebhookEvent.EXPORT_COMPLETED -> "Dados"
        WebhookEvent.WORKFLOW_APPROVED, WebhookEvent.WORKFLOW_REJECTED -> "Workflow"
    }
}
