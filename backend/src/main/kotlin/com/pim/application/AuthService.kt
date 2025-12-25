package com.pim.application

import com.pim.config.JwtService
import com.pim.domain.user.User
import com.pim.infrastructure.persistence.UserRepository
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.*

@Service
@Transactional
class AuthService(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
    private val jwtService: JwtService
) {

    fun login(email: String, password: String): AuthResponse {
        val user = userRepository.findByEmailWithRolesAndPermissions(email)
            ?: throw AuthenticationException("Invalid credentials")

        if (!user.isActive) {
            throw AuthenticationException("User account is disabled")
        }

        if (!passwordEncoder.matches(password, user.passwordHash)) {
            throw AuthenticationException("Invalid credentials")
        }

        user.lastLoginAt = Instant.now()
        userRepository.save(user)

        val accessToken = jwtService.generateToken(user)
        val refreshToken = jwtService.generateRefreshToken(user)

        return AuthResponse(
            accessToken = accessToken,
            refreshToken = refreshToken,
            user = user.toDto()
        )
    }

    fun refreshToken(refreshToken: String): AuthResponse {
        val userId = jwtService.extractUserId(refreshToken)
            ?: throw AuthenticationException("Invalid refresh token")

        val user = userRepository.findByIdWithRolesAndPermissions(userId)
            ?: throw AuthenticationException("User not found")

        if (!user.isActive) {
            throw AuthenticationException("User account is disabled")
        }

        val newAccessToken = jwtService.generateToken(user)
        val newRefreshToken = jwtService.generateRefreshToken(user)

        return AuthResponse(
            accessToken = newAccessToken,
            refreshToken = newRefreshToken,
            user = user.toDto()
        )
    }

    fun register(
        email: String,
        password: String,
        firstName: String,
        lastName: String
    ): User {
        if (userRepository.existsByEmail(email)) {
            throw IllegalArgumentException("Email already registered")
        }

        val user = User(
            email = email,
            passwordHash = passwordEncoder.encode(password),
            firstName = firstName,
            lastName = lastName
        )

        return userRepository.save(user)
    }

    fun getCurrentUser(userId: UUID): UserDto {
        val user = userRepository.findByIdWithRolesAndPermissions(userId)
            ?: throw NoSuchElementException("User not found")
        return user.toDto()
    }

    fun updateProfile(userId: UUID, firstName: String?, lastName: String?, locale: String?, timezone: String?): UserDto {
        val user = userRepository.findById(userId)
            .orElseThrow { NoSuchElementException("User not found") }

        firstName?.let { user.firstName = it }
        lastName?.let { user.lastName = it }
        locale?.let { user.locale = it }
        timezone?.let { user.timezone = it }

        return userRepository.save(user).toDto()
    }

    fun changePassword(userId: UUID, currentPassword: String, newPassword: String) {
        val user = userRepository.findById(userId)
            .orElseThrow { NoSuchElementException("User not found") }

        if (!passwordEncoder.matches(currentPassword, user.passwordHash)) {
            throw AuthenticationException("Current password is incorrect")
        }

        user.passwordHash = passwordEncoder.encode(newPassword)
        userRepository.save(user)
    }

    private fun User.toDto() = UserDto(
        id = id,
        email = email,
        firstName = firstName,
        lastName = lastName,
        fullName = fullName,
        locale = locale,
        timezone = timezone,
        avatar = avatar,
        roles = roles.map { it.name },
        permissions = roles.flatMap { role -> role.permissions.map { it.name } }.distinct()
    )
}

data class AuthResponse(
    val accessToken: String,
    val refreshToken: String,
    val user: UserDto
)

data class UserDto(
    val id: UUID,
    val email: String,
    val firstName: String,
    val lastName: String,
    val fullName: String,
    val locale: String,
    val timezone: String,
    val avatar: String?,
    val roles: List<String>,
    val permissions: List<String>
)

class AuthenticationException(message: String) : RuntimeException(message)
