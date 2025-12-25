package com.pim.infrastructure.persistence

import com.pim.domain.user.Permission
import com.pim.domain.user.Role
import com.pim.domain.user.User
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface UserRepository : JpaRepository<User, UUID> {

    fun findByEmail(email: String): User?

    fun existsByEmail(email: String): Boolean

    @Query("SELECT u FROM User u WHERE u.isActive = true")
    fun findAllActive(): List<User>

    @Query("SELECT u FROM User u JOIN u.roles r WHERE r.name = :roleName")
    fun findByRoleName(@Param("roleName") roleName: String): List<User>

    @Query("""
        SELECT u FROM User u
        LEFT JOIN FETCH u.roles r
        LEFT JOIN FETCH r.permissions
        WHERE u.id = :id
    """)
    fun findByIdWithRolesAndPermissions(@Param("id") id: UUID): User?

    @Query("""
        SELECT u FROM User u
        LEFT JOIN FETCH u.roles r
        LEFT JOIN FETCH r.permissions
        WHERE u.email = :email
    """)
    fun findByEmailWithRolesAndPermissions(@Param("email") email: String): User?
}

@Repository
interface RoleRepository : JpaRepository<Role, UUID> {

    fun findByName(name: String): Role?

    fun existsByName(name: String): Boolean

    @Query("""
        SELECT r FROM Role r
        LEFT JOIN FETCH r.permissions
        WHERE r.id = :id
    """)
    fun findByIdWithPermissions(@Param("id") id: UUID): Role?
}

@Repository
interface PermissionRepository : JpaRepository<Permission, UUID> {

    fun findByName(name: String): Permission?

    fun findByModule(module: String): List<Permission>
}
