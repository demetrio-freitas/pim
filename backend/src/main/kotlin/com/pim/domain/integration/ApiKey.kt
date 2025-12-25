package com.pim.domain.integration

import jakarta.persistence.*
import java.time.Instant
import java.util.*

@Entity
@Table(name = "api_keys")
data class ApiKey(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(nullable = false)
    var name: String,

    @Column(nullable = false, unique = true)
    val keyHash: String, // Armazena hash da chave, não a chave em si

    @Column(name = "key_prefix", nullable = false)
    val keyPrefix: String, // Primeiros 8 caracteres para identificação

    @Column(columnDefinition = "TEXT")
    var description: String? = null,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: ApiKeyStatus = ApiKeyStatus.ACTIVE,

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "api_key_permissions", joinColumns = [JoinColumn(name = "api_key_id")])
    @Column(name = "permission")
    var permissions: MutableSet<String> = mutableSetOf(),

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "api_key_allowed_ips", joinColumns = [JoinColumn(name = "api_key_id")])
    @Column(name = "ip_address")
    var allowedIps: MutableSet<String> = mutableSetOf(), // Vazio = todos permitidos

    @Column(name = "rate_limit")
    var rateLimit: Int = 1000, // Requisições por hora

    @Column(name = "requests_today")
    var requestsToday: Int = 0,

    @Column(name = "last_used_at")
    var lastUsedAt: Instant? = null,

    @Column(name = "expires_at")
    var expiresAt: Instant? = null,

    @Column(name = "created_by")
    var createdBy: UUID? = null,

    @Column(name = "created_at", nullable = false)
    var createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()
) {
    fun isValid(): Boolean {
        if (status != ApiKeyStatus.ACTIVE) return false
        if (expiresAt != null && expiresAt!!.isBefore(Instant.now())) return false
        return true
    }

    fun hasPermission(permission: String): Boolean {
        if (permissions.contains("*")) return true // Wildcard = todas permissões
        if (permissions.contains(permission)) return true

        // Verifica permissões com wildcard parcial (ex: "products.*" permite "products.read")
        val parts = permission.split(".")
        if (parts.size > 1) {
            val wildcardPermission = "${parts[0]}.*"
            if (permissions.contains(wildcardPermission)) return true
        }

        return false
    }

    fun isIpAllowed(ip: String): Boolean {
        if (allowedIps.isEmpty()) return true // Sem restrição
        return allowedIps.contains(ip)
    }
}

enum class ApiKeyStatus {
    ACTIVE,
    INACTIVE,
    REVOKED
}

// Permissões disponíveis para API Keys
object ApiPermissions {
    const val PRODUCTS_READ = "products.read"
    const val PRODUCTS_WRITE = "products.write"
    const val PRODUCTS_DELETE = "products.delete"

    const val CATEGORIES_READ = "categories.read"
    const val CATEGORIES_WRITE = "categories.write"
    const val CATEGORIES_DELETE = "categories.delete"

    const val ATTRIBUTES_READ = "attributes.read"
    const val ATTRIBUTES_WRITE = "attributes.write"
    const val ATTRIBUTES_DELETE = "attributes.delete"

    const val MEDIA_READ = "media.read"
    const val MEDIA_WRITE = "media.write"
    const val MEDIA_DELETE = "media.delete"

    const val EXPORT = "export"
    const val IMPORT = "import"

    const val ALL = "*"

    val allPermissions = listOf(
        PRODUCTS_READ, PRODUCTS_WRITE, PRODUCTS_DELETE,
        CATEGORIES_READ, CATEGORIES_WRITE, CATEGORIES_DELETE,
        ATTRIBUTES_READ, ATTRIBUTES_WRITE, ATTRIBUTES_DELETE,
        MEDIA_READ, MEDIA_WRITE, MEDIA_DELETE,
        EXPORT, IMPORT
    )
}
