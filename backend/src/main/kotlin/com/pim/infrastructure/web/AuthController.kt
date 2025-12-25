package com.pim.infrastructure.web

import com.pim.application.AuthResponse
import com.pim.application.AuthService
import com.pim.application.UserDto
import com.pim.domain.user.User
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "Authentication endpoints")
class AuthController(
    private val authService: AuthService
) {

    @PostMapping("/login")
    @Operation(summary = "Login with email and password")
    fun login(@Valid @RequestBody request: LoginRequest): ResponseEntity<AuthResponse> {
        val response = authService.login(request.email, request.password)
        return ResponseEntity.ok(response)
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh access token")
    fun refresh(@Valid @RequestBody request: RefreshTokenRequest): ResponseEntity<AuthResponse> {
        val response = authService.refreshToken(request.refreshToken)
        return ResponseEntity.ok(response)
    }

    @PostMapping("/register")
    @Operation(summary = "Register a new user")
    fun register(@Valid @RequestBody request: RegisterRequest): ResponseEntity<Map<String, String>> {
        authService.register(
            email = request.email,
            password = request.password,
            firstName = request.firstName,
            lastName = request.lastName
        )
        return ResponseEntity.ok(mapOf("message" to "User registered successfully"))
    }

    @GetMapping("/me")
    @Operation(summary = "Get current user info")
    fun me(@AuthenticationPrincipal user: User): ResponseEntity<UserDto> {
        val userDto = authService.getCurrentUser(user.id)
        return ResponseEntity.ok(userDto)
    }

    @PutMapping("/profile")
    @Operation(summary = "Update user profile")
    fun updateProfile(
        @AuthenticationPrincipal user: User,
        @Valid @RequestBody request: UpdateProfileRequest
    ): ResponseEntity<UserDto> {
        val updated = authService.updateProfile(
            userId = user.id,
            firstName = request.firstName,
            lastName = request.lastName,
            locale = request.locale,
            timezone = request.timezone
        )
        return ResponseEntity.ok(updated)
    }

    @PostMapping("/change-password")
    @Operation(summary = "Change user password")
    fun changePassword(
        @AuthenticationPrincipal user: User,
        @Valid @RequestBody request: ChangePasswordRequest
    ): ResponseEntity<Map<String, String>> {
        authService.changePassword(user.id, request.currentPassword, request.newPassword)
        return ResponseEntity.ok(mapOf("message" to "Password changed successfully"))
    }
}

data class LoginRequest(
    @field:Email @field:NotBlank val email: String,
    @field:NotBlank val password: String
)

data class RefreshTokenRequest(
    @field:NotBlank val refreshToken: String
)

data class RegisterRequest(
    @field:Email @field:NotBlank val email: String,
    @field:NotBlank @field:Size(min = 8) val password: String,
    @field:NotBlank val firstName: String,
    @field:NotBlank val lastName: String
)

data class UpdateProfileRequest(
    val firstName: String? = null,
    val lastName: String? = null,
    val locale: String? = null,
    val timezone: String? = null
)

data class ChangePasswordRequest(
    @field:NotBlank val currentPassword: String,
    @field:NotBlank @field:Size(min = 8) val newPassword: String
)
