package com.pim.domain.user

import jakarta.persistence.*
import org.springframework.data.annotation.CreatedDate
import org.springframework.data.annotation.LastModifiedDate
import org.springframework.data.jpa.domain.support.AuditingEntityListener
import org.springframework.security.core.GrantedAuthority
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.userdetails.UserDetails
import java.time.Instant
import java.util.*

@Entity
@Table(name = "users")
@EntityListeners(AuditingEntityListener::class)
data class User(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(nullable = false, unique = true)
    var email: String,

    @Column(nullable = false, name = "password")
    @get:JvmName("getPasswordInternal")
    var passwordHash: String,

    @Column(name = "first_name", nullable = false)
    var firstName: String,

    @Column(name = "last_name", nullable = false)
    var lastName: String,

    @Column(name = "is_active", nullable = false)
    var isActive: Boolean = true,

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "user_roles",
        joinColumns = [JoinColumn(name = "user_id")],
        inverseJoinColumns = [JoinColumn(name = "role_id")]
    )
    var roles: MutableSet<Role> = mutableSetOf(),

    @Column(name = "locale")
    var locale: String = "pt_BR",

    @Column(name = "timezone")
    var timezone: String = "America/Sao_Paulo",

    @Column(name = "avatar")
    var avatar: String? = null,

    @Column(name = "last_login_at")
    var lastLoginAt: Instant? = null,

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant = Instant.now(),

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()
) : UserDetails {
    val fullName: String
        get() = "$firstName $lastName"

    fun hasRole(roleName: String): Boolean {
        return roles.any { it.name == roleName }
    }

    fun hasPermission(permission: String): Boolean {
        return roles.any { role ->
            role.permissions.any { it.name == permission }
        }
    }

    // UserDetails implementation
    override fun getAuthorities(): Collection<GrantedAuthority> {
        val authorities = mutableListOf<GrantedAuthority>()
        roles.forEach { role ->
            authorities.add(SimpleGrantedAuthority("ROLE_${role.name}"))
            role.permissions.forEach { permission ->
                authorities.add(SimpleGrantedAuthority(permission.name))
            }
        }
        return authorities
    }

    override fun getPassword(): String = passwordHash

    override fun getUsername(): String = email

    override fun isAccountNonExpired(): Boolean = true

    override fun isAccountNonLocked(): Boolean = true

    override fun isCredentialsNonExpired(): Boolean = true

    override fun isEnabled(): Boolean = isActive
}

@Entity
@Table(name = "roles")
@EntityListeners(AuditingEntityListener::class)
data class Role(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(nullable = false, unique = true)
    var name: String,

    @Column(columnDefinition = "TEXT")
    var description: String? = null,

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "role_permissions",
        joinColumns = [JoinColumn(name = "role_id")],
        inverseJoinColumns = [JoinColumn(name = "permission_id")]
    )
    var permissions: MutableSet<Permission> = mutableSetOf(),

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant = Instant.now(),

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()
)

@Entity
@Table(name = "permissions")
data class Permission(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(nullable = false, unique = true)
    var name: String,

    @Column(columnDefinition = "TEXT")
    var description: String? = null,

    @Column(nullable = false)
    var module: String
)
