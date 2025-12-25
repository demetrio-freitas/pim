package com.pim.application

import com.pim.domain.user.Role
import com.pim.domain.user.User
import com.pim.infrastructure.persistence.RoleRepository
import com.pim.infrastructure.persistence.UserRepository
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

@Service
@Transactional
class UserService(
    private val userRepository: UserRepository,
    private val roleRepository: RoleRepository,
    private val passwordEncoder: PasswordEncoder
) {

    fun findAll(): List<User> {
        return userRepository.findAll()
    }

    fun findById(id: UUID): User? {
        return userRepository.findByIdWithRolesAndPermissions(id)
    }

    fun findByEmail(email: String): User? {
        return userRepository.findByEmailWithRolesAndPermissions(email)
    }

    fun create(user: User, roleNames: Set<String> = emptySet()): User {
        if (userRepository.existsByEmail(user.email)) {
            throw IllegalArgumentException("User with email '${user.email}' already exists")
        }

        val hashedPassword = passwordEncoder.encode(user.passwordHash)
        user.passwordHash = hashedPassword

        val roles = roleNames.mapNotNull { roleRepository.findByName(it) }.toMutableSet()
        if (roles.isEmpty()) {
            roleRepository.findByName("VIEWER")?.let { roles.add(it) }
        }
        user.roles = roles

        return userRepository.save(user)
    }

    fun update(id: UUID, updateFn: (User) -> Unit): User {
        val user = userRepository.findById(id)
            .orElseThrow { NoSuchElementException("User not found with id: $id") }
        updateFn(user)
        return userRepository.save(user)
    }

    fun updatePassword(id: UUID, newPassword: String): User {
        val user = userRepository.findById(id)
            .orElseThrow { NoSuchElementException("User not found with id: $id") }
        user.passwordHash = passwordEncoder.encode(newPassword)
        return userRepository.save(user)
    }

    fun assignRoles(userId: UUID, roleNames: Set<String>): User {
        val user = userRepository.findById(userId)
            .orElseThrow { NoSuchElementException("User not found with id: $userId") }

        val roles = roleNames.mapNotNull { roleRepository.findByName(it) }.toMutableSet()
        user.roles = roles

        return userRepository.save(user)
    }

    fun delete(id: UUID) {
        if (!userRepository.existsById(id)) {
            throw NoSuchElementException("User not found with id: $id")
        }
        userRepository.deleteById(id)
    }

    fun toggleActive(id: UUID): User {
        val user = userRepository.findById(id)
            .orElseThrow { NoSuchElementException("User not found with id: $id") }
        user.isActive = !user.isActive
        return userRepository.save(user)
    }

    fun findAllRoles(): List<Role> {
        return roleRepository.findAll()
    }

    fun findRoleById(id: UUID): Role? {
        return roleRepository.findByIdWithPermissions(id)
    }
}
