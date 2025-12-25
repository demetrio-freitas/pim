package com.pim.infrastructure.web

import com.pim.application.UserService
import com.pim.domain.user.User
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*
import java.time.Instant
import java.util.*

@RestController
@RequestMapping("/api/users")
@Tag(name = "Users", description = "User management endpoints")
class UserController(
    private val userService: UserService
) {

    @GetMapping
    @Operation(summary = "List all users")
    @PreAuthorize("hasAuthority('users.view')")
    fun list(): ResponseEntity<List<UserResponse>> {
        val users = userService.findAll()
        return ResponseEntity.ok(users.map { it.toResponse() })
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get user by ID")
    @PreAuthorize("hasAuthority('users.view')")
    fun getById(@PathVariable id: UUID): ResponseEntity<UserDetailResponse> {
        val user = userService.findById(id)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(user.toDetailResponse())
    }

    @PostMapping
    @Operation(summary = "Create a new user")
    @PreAuthorize("hasAuthority('users.create')")
    fun create(@Valid @RequestBody request: CreateUserRequest): ResponseEntity<UserResponse> {
        val user = User(
            email = request.email,
            passwordHash = request.password,
            firstName = request.firstName,
            lastName = request.lastName
        )
        val created = userService.create(user, request.roles ?: emptySet())
        return ResponseEntity.status(HttpStatus.CREATED).body(created.toResponse())
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a user")
    @PreAuthorize("hasAuthority('users.edit')")
    fun update(
        @PathVariable id: UUID,
        @Valid @RequestBody request: UpdateUserRequest
    ): ResponseEntity<UserResponse> {
        val updated = userService.update(id) { user ->
            request.firstName?.let { user.firstName = it }
            request.lastName?.let { user.lastName = it }
            request.locale?.let { user.locale = it }
            request.timezone?.let { user.timezone = it }
        }
        return ResponseEntity.ok(updated.toResponse())
    }

    @PatchMapping("/{id}/password")
    @Operation(summary = "Update user password")
    @PreAuthorize("hasAuthority('users.edit')")
    fun updatePassword(
        @PathVariable id: UUID,
        @Valid @RequestBody request: UpdatePasswordRequest
    ): ResponseEntity<UserResponse> {
        val updated = userService.updatePassword(id, request.password)
        return ResponseEntity.ok(updated.toResponse())
    }

    @PatchMapping("/{id}/roles")
    @Operation(summary = "Assign roles to user")
    @PreAuthorize("hasAuthority('users.edit')")
    fun assignRoles(
        @PathVariable id: UUID,
        @RequestBody request: AssignRolesRequest
    ): ResponseEntity<UserResponse> {
        val updated = userService.assignRoles(id, request.roles)
        return ResponseEntity.ok(updated.toResponse())
    }

    @PatchMapping("/{id}/toggle-active")
    @Operation(summary = "Toggle user active status")
    @PreAuthorize("hasAuthority('users.edit')")
    fun toggleActive(@PathVariable id: UUID): ResponseEntity<UserResponse> {
        val updated = userService.toggleActive(id)
        return ResponseEntity.ok(updated.toResponse())
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a user")
    @PreAuthorize("hasAuthority('users.delete')")
    fun delete(@PathVariable id: UUID): ResponseEntity<Void> {
        userService.delete(id)
        return ResponseEntity.noContent().build()
    }

    @GetMapping("/roles")
    @Operation(summary = "List all roles")
    @PreAuthorize("hasAuthority('users.view')")
    fun listRoles(): ResponseEntity<List<RoleResponse>> {
        val roles = userService.findAllRoles()
        return ResponseEntity.ok(roles.map { RoleResponse(it.id, it.name, it.description) })
    }
}

// DTOs
data class CreateUserRequest(
    @field:Email @field:NotBlank val email: String,
    @field:NotBlank val password: String,
    @field:NotBlank val firstName: String,
    @field:NotBlank val lastName: String,
    val roles: Set<String>? = null
)

data class UpdateUserRequest(
    val firstName: String? = null,
    val lastName: String? = null,
    val locale: String? = null,
    val timezone: String? = null
)

data class UpdatePasswordRequest(
    @field:NotBlank val password: String
)

data class AssignRolesRequest(
    val roles: Set<String>
)

data class UserResponse(
    val id: UUID,
    val email: String,
    val firstName: String,
    val lastName: String,
    val fullName: String,
    val isActive: Boolean,
    val locale: String,
    val roles: List<String>,
    val lastLoginAt: Instant?
)

data class UserDetailResponse(
    val id: UUID,
    val email: String,
    val firstName: String,
    val lastName: String,
    val fullName: String,
    val isActive: Boolean,
    val locale: String,
    val timezone: String,
    val avatar: String?,
    val roles: List<RoleResponse>,
    val permissions: List<String>,
    val lastLoginAt: Instant?,
    val createdAt: Instant,
    val updatedAt: Instant
)

data class RoleResponse(
    val id: UUID,
    val name: String,
    val description: String?
)

fun User.toResponse() = UserResponse(
    id = id,
    email = email,
    firstName = firstName,
    lastName = lastName,
    fullName = fullName,
    isActive = isActive,
    locale = locale,
    roles = roles.map { it.name },
    lastLoginAt = lastLoginAt
)

fun User.toDetailResponse() = UserDetailResponse(
    id = id,
    email = email,
    firstName = firstName,
    lastName = lastName,
    fullName = fullName,
    isActive = isActive,
    locale = locale,
    timezone = timezone,
    avatar = avatar,
    roles = roles.map { RoleResponse(it.id, it.name, it.description) },
    permissions = roles.flatMap { it.permissions }.map { it.name }.distinct(),
    lastLoginAt = lastLoginAt,
    createdAt = createdAt,
    updatedAt = updatedAt
)
