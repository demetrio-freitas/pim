package com.pim.infrastructure.web

import com.pim.application.AuthResponse
import com.pim.application.AuthService
import com.pim.application.UserDto
import com.pim.config.JwtService
import com.pim.config.security.RateLimitingService
import com.pim.config.security.ValidPassword
import com.pim.domain.user.User
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "Authentication endpoints")
class AuthController(
    private val authService: AuthService,
    private val jwtService: JwtService,
    private val rateLimitingService: RateLimitingService
) {
    private val logger = LoggerFactory.getLogger(AuthController::class.java)

    @PostMapping("/login")
    @Operation(summary = "Login with email and password")
    fun login(
        @Valid @RequestBody request: LoginRequest,
        httpRequest: HttpServletRequest
    ): ResponseEntity<Any> {
        val clientIp = getClientIp(httpRequest)
        val identifier = "${request.email}:$clientIp"

        // SECURITY: Check if account is locked
        val lockoutTime = rateLimitingService.getLockoutTimeRemaining(identifier)
        if (lockoutTime > 0) {
            logger.warn("Login attempt for locked account: ${request.email} from $clientIp")
            return ResponseEntity
                .status(HttpStatus.TOO_MANY_REQUESTS)
                .body(mapOf(
                    "error" to "Account temporarily locked",
                    "message" to "Too many failed login attempts. Please try again in ${lockoutTime / 60} minutes.",
                    "retryAfter" to lockoutTime
                ))
        }

        return try {
            val response = authService.login(request.email, request.password)
            // SECURITY: Clear failed attempts on successful login
            rateLimitingService.recordSuccessfulLogin(identifier)
            rateLimitingService.recordSuccessfulLogin(request.email) // Also clear by email only
            logger.info("Successful login for user: ${request.email}")
            ResponseEntity.ok(response)
        } catch (e: Exception) {
            // SECURITY: Record failed login attempt
            val remainingAttempts = rateLimitingService.recordFailedLoginAttempt(identifier)
            rateLimitingService.recordFailedLoginAttempt(request.email)
            logger.warn("Failed login attempt for user: ${request.email} from $clientIp. Remaining attempts: $remainingAttempts")

            val message = if (remainingAttempts > 0) {
                "Invalid credentials. $remainingAttempts attempts remaining."
            } else {
                "Account temporarily locked due to too many failed attempts."
            }

            ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(mapOf("error" to "Authentication failed", "message" to message))
        }
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout and invalidate current token")
    fun logout(
        @AuthenticationPrincipal user: User,
        @RequestHeader("Authorization") authHeader: String?
    ): ResponseEntity<Map<String, String>> {
        val token = authHeader?.removePrefix("Bearer ")?.trim()

        if (token != null) {
            jwtService.blacklistToken(token, user.id.toString())
            logger.info("User logged out: ${user.email}")
        }

        return ResponseEntity.ok(mapOf("message" to "Logged out successfully"))
    }

    @PostMapping("/logout-all")
    @Operation(summary = "Logout from all devices (invalidate all tokens)")
    fun logoutAll(@AuthenticationPrincipal user: User): ResponseEntity<Map<String, String>> {
        jwtService.invalidateAllUserTokens(user.id.toString())
        logger.info("All sessions invalidated for user: ${user.email}")
        return ResponseEntity.ok(mapOf("message" to "Logged out from all devices successfully"))
    }

    private fun getClientIp(request: HttpServletRequest): String {
        val forwardedFor = request.getHeader("X-Forwarded-For")
        if (!forwardedFor.isNullOrBlank()) {
            return forwardedFor.split(",").first().trim()
        }
        return request.remoteAddr ?: "unknown"
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
    @field:NotBlank @field:ValidPassword val password: String,
    @field:NotBlank @field:Size(min = 1, max = 100) val firstName: String,
    @field:NotBlank @field:Size(min = 1, max = 100) val lastName: String
)

data class UpdateProfileRequest(
    val firstName: String? = null,
    val lastName: String? = null,
    val locale: String? = null,
    val timezone: String? = null
)

data class ChangePasswordRequest(
    @field:NotBlank val currentPassword: String,
    @field:NotBlank @field:ValidPassword val newPassword: String
)
