package com.pim.application

import com.pim.domain.integration.ApiKey
import com.pim.domain.integration.ApiKeyStatus
import com.pim.domain.integration.ApiPermissions
import com.pim.infrastructure.persistence.ApiKeyRepository
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Instant
import java.util.*

data class ApiKeyCreateRequest(
    val name: String,
    val description: String? = null,
    val permissions: Set<String> = setOf(ApiPermissions.PRODUCTS_READ),
    val allowedIps: Set<String> = emptySet(),
    val rateLimit: Int = 1000,
    val expiresAt: Instant? = null
)

data class ApiKeyUpdateRequest(
    val name: String? = null,
    val description: String? = null,
    val permissions: Set<String>? = null,
    val allowedIps: Set<String>? = null,
    val rateLimit: Int? = null,
    val status: ApiKeyStatus? = null,
    val expiresAt: Instant? = null
)

data class ApiKeyResponse(
    val id: UUID,
    val name: String,
    val keyPrefix: String,
    val description: String?,
    val status: ApiKeyStatus,
    val permissions: Set<String>,
    val allowedIps: Set<String>,
    val rateLimit: Int,
    val requestsToday: Int,
    val lastUsedAt: Instant?,
    val expiresAt: Instant?,
    val createdAt: Instant
)

data class ApiKeyCreatedResponse(
    val id: UUID,
    val name: String,
    val apiKey: String, // Chave completa - só mostrada uma vez!
    val keyPrefix: String,
    val permissions: Set<String>,
    val expiresAt: Instant?,
    val createdAt: Instant
)

@Service
@Transactional
class ApiKeyService(
    private val apiKeyRepository: ApiKeyRepository
) {
    private val secureRandom = SecureRandom()

    fun create(request: ApiKeyCreateRequest, createdBy: UUID?): ApiKeyCreatedResponse {
        // Gera chave aleatória de 32 bytes (256 bits)
        val keyBytes = ByteArray(32)
        secureRandom.nextBytes(keyBytes)
        val rawKey = "pim_" + Base64.getUrlEncoder().withoutPadding().encodeToString(keyBytes)

        val keyPrefix = rawKey.take(12)
        val keyHash = hashKey(rawKey)

        val apiKey = ApiKey(
            name = request.name,
            keyHash = keyHash,
            keyPrefix = keyPrefix,
            description = request.description,
            permissions = request.permissions.toMutableSet(),
            allowedIps = request.allowedIps.toMutableSet(),
            rateLimit = request.rateLimit,
            expiresAt = request.expiresAt,
            createdBy = createdBy
        )

        val saved = apiKeyRepository.save(apiKey)

        return ApiKeyCreatedResponse(
            id = saved.id,
            name = saved.name,
            apiKey = rawKey, // Retorna chave completa apenas na criação
            keyPrefix = saved.keyPrefix,
            permissions = saved.permissions,
            expiresAt = saved.expiresAt,
            createdAt = saved.createdAt
        )
    }

    fun update(id: UUID, request: ApiKeyUpdateRequest): ApiKeyResponse {
        val apiKey = apiKeyRepository.findById(id)
            .orElseThrow { IllegalArgumentException("API Key não encontrada") }

        request.name?.let { apiKey.name = it }
        request.description?.let { apiKey.description = it }
        request.permissions?.let { apiKey.permissions = it.toMutableSet() }
        request.allowedIps?.let { apiKey.allowedIps = it.toMutableSet() }
        request.rateLimit?.let { apiKey.rateLimit = it }
        request.status?.let { apiKey.status = it }
        request.expiresAt?.let { apiKey.expiresAt = it }
        apiKey.updatedAt = Instant.now()

        val saved = apiKeyRepository.save(apiKey)
        return saved.toResponse()
    }

    fun revoke(id: UUID): ApiKeyResponse {
        val apiKey = apiKeyRepository.findById(id)
            .orElseThrow { IllegalArgumentException("API Key não encontrada") }

        apiKey.status = ApiKeyStatus.REVOKED
        apiKey.updatedAt = Instant.now()

        val saved = apiKeyRepository.save(apiKey)
        return saved.toResponse()
    }

    fun delete(id: UUID) {
        apiKeyRepository.deleteById(id)
    }

    fun getById(id: UUID): ApiKeyResponse? {
        return apiKeyRepository.findById(id).orElse(null)?.toResponse()
    }

    fun getAll(pageable: Pageable): Page<ApiKeyResponse> {
        return apiKeyRepository.findAllByOrderByCreatedAtDesc(pageable)
            .map { it.toResponse() }
    }

    fun validateKey(rawKey: String, requiredPermission: String? = null, clientIp: String? = null): ApiKey? {
        val keyHash = hashKey(rawKey)
        val apiKey = apiKeyRepository.findByKeyHash(keyHash) ?: return null

        // Verifica se está válida
        if (!apiKey.isValid()) return null

        // Verifica IP
        if (clientIp != null && !apiKey.isIpAllowed(clientIp)) return null

        // Verifica permissão
        if (requiredPermission != null && !apiKey.hasPermission(requiredPermission)) return null

        // Verifica rate limit
        if (apiKey.requestsToday >= apiKey.rateLimit) return null

        // Atualiza uso
        apiKey.lastUsedAt = Instant.now()
        apiKey.requestsToday++
        apiKeyRepository.save(apiKey)

        return apiKey
    }

    fun resetDailyLimits() {
        val activeKeys = apiKeyRepository.findAllActive(Instant.now())
        activeKeys.forEach {
            it.requestsToday = 0
            apiKeyRepository.save(it)
        }
    }

    fun getAvailablePermissions(): List<Map<String, String>> {
        return listOf(
            mapOf("value" to ApiPermissions.PRODUCTS_READ, "label" to "Ler Produtos", "group" to "Produtos"),
            mapOf("value" to ApiPermissions.PRODUCTS_WRITE, "label" to "Criar/Editar Produtos", "group" to "Produtos"),
            mapOf("value" to ApiPermissions.PRODUCTS_DELETE, "label" to "Excluir Produtos", "group" to "Produtos"),
            mapOf("value" to ApiPermissions.CATEGORIES_READ, "label" to "Ler Categorias", "group" to "Categorias"),
            mapOf("value" to ApiPermissions.CATEGORIES_WRITE, "label" to "Criar/Editar Categorias", "group" to "Categorias"),
            mapOf("value" to ApiPermissions.CATEGORIES_DELETE, "label" to "Excluir Categorias", "group" to "Categorias"),
            mapOf("value" to ApiPermissions.ATTRIBUTES_READ, "label" to "Ler Atributos", "group" to "Atributos"),
            mapOf("value" to ApiPermissions.ATTRIBUTES_WRITE, "label" to "Criar/Editar Atributos", "group" to "Atributos"),
            mapOf("value" to ApiPermissions.ATTRIBUTES_DELETE, "label" to "Excluir Atributos", "group" to "Atributos"),
            mapOf("value" to ApiPermissions.MEDIA_READ, "label" to "Ler Mídia", "group" to "Mídia"),
            mapOf("value" to ApiPermissions.MEDIA_WRITE, "label" to "Upload de Mídia", "group" to "Mídia"),
            mapOf("value" to ApiPermissions.MEDIA_DELETE, "label" to "Excluir Mídia", "group" to "Mídia"),
            mapOf("value" to ApiPermissions.EXPORT, "label" to "Exportar Dados", "group" to "Dados"),
            mapOf("value" to ApiPermissions.IMPORT, "label" to "Importar Dados", "group" to "Dados"),
            mapOf("value" to ApiPermissions.ALL, "label" to "Acesso Total", "group" to "Admin")
        )
    }

    private fun hashKey(key: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val hashBytes = digest.digest(key.toByteArray())
        return hashBytes.joinToString("") { "%02x".format(it) }
    }

    private fun ApiKey.toResponse() = ApiKeyResponse(
        id = id,
        name = name,
        keyPrefix = keyPrefix,
        description = description,
        status = status,
        permissions = permissions,
        allowedIps = allowedIps,
        rateLimit = rateLimit,
        requestsToday = requestsToday,
        lastUsedAt = lastUsedAt,
        expiresAt = expiresAt,
        createdAt = createdAt
    )
}
