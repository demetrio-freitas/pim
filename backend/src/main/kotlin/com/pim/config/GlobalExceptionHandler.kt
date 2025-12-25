package com.pim.config

import com.pim.application.AuthenticationException
import com.pim.domain.shared.*
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.AccessDeniedException
import org.springframework.validation.FieldError
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.multipart.MaxUploadSizeExceededException
import java.time.Instant
import java.util.UUID

@RestControllerAdvice
class GlobalExceptionHandler {

    private val logger = LoggerFactory.getLogger(GlobalExceptionHandler::class.java)

    // ============================================
    // Domain Exception Handlers
    // ============================================

    @ExceptionHandler(EntityNotFoundException::class)
    fun handleEntityNotFound(ex: EntityNotFoundException): ResponseEntity<ErrorResponse> {
        logger.debug("Entity not found: ${ex.message}")
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
            ErrorResponse(
                status = HttpStatus.NOT_FOUND.value(),
                error = "Not Found",
                errorCode = ex.errorCode,
                message = ex.message,
                timestamp = Instant.now(),
                details = ex.details.mapValues { it.value?.toString() }
            )
        )
    }

    @ExceptionHandler(ValidationException::class)
    fun handleValidationException(ex: ValidationException): ResponseEntity<ErrorResponse> {
        logger.debug("Validation error: ${ex.message}")
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
            ErrorResponse(
                status = HttpStatus.BAD_REQUEST.value(),
                error = "Validation Error",
                errorCode = ex.errorCode,
                message = ex.message,
                timestamp = Instant.now(),
                details = ex.details.mapValues { it.value?.toString() }
            )
        )
    }

    @ExceptionHandler(MultipleValidationException::class)
    fun handleMultipleValidationException(ex: MultipleValidationException): ResponseEntity<ErrorResponse> {
        logger.debug("Multiple validation errors: ${ex.errors.size} errors")
        val fieldErrors = ex.errors.associate { it.field to it.message }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
            ErrorResponse(
                status = HttpStatus.BAD_REQUEST.value(),
                error = "Validation Error",
                errorCode = ex.errorCode,
                message = ex.message,
                timestamp = Instant.now(),
                details = fieldErrors
            )
        )
    }

    @ExceptionHandler(BusinessRuleException::class)
    fun handleBusinessRule(ex: BusinessRuleException): ResponseEntity<ErrorResponse> {
        logger.warn("Business rule violation: ${ex.errorCode} - ${ex.message}")
        return ResponseEntity.status(HttpStatus.CONFLICT).body(
            ErrorResponse(
                status = HttpStatus.CONFLICT.value(),
                error = "Business Rule Violation",
                errorCode = ex.errorCode,
                message = ex.message,
                timestamp = Instant.now(),
                details = ex.details.mapValues { it.value?.toString() }
            )
        )
    }

    @ExceptionHandler(AuthException::class)
    fun handleAuthException(ex: AuthException): ResponseEntity<ErrorResponse> {
        logger.warn("Authentication/Authorization error: ${ex.errorCode}")
        val status = when (ex) {
            is InvalidCredentialsException, is TokenExpiredException, is InvalidTokenException -> HttpStatus.UNAUTHORIZED
            is AccountDisabledException -> HttpStatus.FORBIDDEN
            is InsufficientPermissionsException -> HttpStatus.FORBIDDEN
            is PasswordMismatchException -> HttpStatus.BAD_REQUEST
        }
        return ResponseEntity.status(status).body(
            ErrorResponse(
                status = status.value(),
                error = status.reasonPhrase,
                errorCode = ex.errorCode,
                message = ex.message,
                timestamp = Instant.now(),
                details = ex.details.mapValues { it.value?.toString() }
            )
        )
    }

    @ExceptionHandler(DataTransferException::class)
    fun handleDataTransfer(ex: DataTransferException): ResponseEntity<ErrorResponse> {
        logger.warn("Data transfer error: ${ex.errorCode} - ${ex.message}")
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
            ErrorResponse(
                status = HttpStatus.BAD_REQUEST.value(),
                error = "Data Transfer Error",
                errorCode = ex.errorCode,
                message = ex.message,
                timestamp = Instant.now(),
                details = ex.details.mapValues { it.value?.toString() }
            )
        )
    }

    // ============================================
    // Legacy Exception Handlers (for backward compatibility)
    // ============================================

    @ExceptionHandler(NoSuchElementException::class)
    fun handleNotFound(ex: NoSuchElementException): ResponseEntity<ErrorResponse> {
        logger.debug("Resource not found: ${ex.message}")
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
            ErrorResponse(
                status = HttpStatus.NOT_FOUND.value(),
                error = "Not Found",
                errorCode = "RESOURCE_NOT_FOUND",
                message = ex.message ?: "Resource not found",
                timestamp = Instant.now()
            )
        )
    }

    @ExceptionHandler(IllegalArgumentException::class)
    fun handleBadRequest(ex: IllegalArgumentException): ResponseEntity<ErrorResponse> {
        logger.debug("Bad request: ${ex.message}")
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
            ErrorResponse(
                status = HttpStatus.BAD_REQUEST.value(),
                error = "Bad Request",
                errorCode = "INVALID_REQUEST",
                message = ex.message ?: "Invalid request",
                timestamp = Instant.now()
            )
        )
    }

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidation(ex: MethodArgumentNotValidException): ResponseEntity<ErrorResponse> {
        val errors = ex.bindingResult.allErrors.associate { error ->
            val fieldName = (error as? FieldError)?.field ?: "unknown"
            fieldName to (error.defaultMessage ?: "Invalid value")
        }
        logger.debug("Validation failed: ${errors.keys.joinToString()}")

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
            ErrorResponse(
                status = HttpStatus.BAD_REQUEST.value(),
                error = "Validation Error",
                errorCode = "VALIDATION_FAILED",
                message = "One or more fields are invalid",
                timestamp = Instant.now(),
                details = errors
            )
        )
    }

    @ExceptionHandler(AccessDeniedException::class)
    fun handleAccessDenied(ex: AccessDeniedException): ResponseEntity<ErrorResponse> {
        logger.warn("Access denied: ${ex.message}")
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
            ErrorResponse(
                status = HttpStatus.FORBIDDEN.value(),
                error = "Access Denied",
                errorCode = "ACCESS_DENIED",
                message = "You don't have permission to access this resource",
                timestamp = Instant.now()
            )
        )
    }

    @ExceptionHandler(AuthenticationException::class)
    fun handleAuthentication(ex: AuthenticationException): ResponseEntity<ErrorResponse> {
        logger.warn("Authentication failed: ${ex.message}")
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
            ErrorResponse(
                status = HttpStatus.UNAUTHORIZED.value(),
                error = "Unauthorized",
                errorCode = "AUTHENTICATION_FAILED",
                message = ex.message ?: "Authentication required",
                timestamp = Instant.now()
            )
        )
    }

    @ExceptionHandler(org.springframework.security.core.AuthenticationException::class)
    fun handleSpringAuthentication(ex: org.springframework.security.core.AuthenticationException): ResponseEntity<ErrorResponse> {
        logger.warn("Spring authentication failed: ${ex.message}")
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
            ErrorResponse(
                status = HttpStatus.UNAUTHORIZED.value(),
                error = "Unauthorized",
                errorCode = "AUTHENTICATION_FAILED",
                message = ex.message ?: "Authentication required",
                timestamp = Instant.now()
            )
        )
    }

    @ExceptionHandler(MaxUploadSizeExceededException::class)
    fun handleMaxUploadSize(ex: MaxUploadSizeExceededException): ResponseEntity<ErrorResponse> {
        logger.warn("File upload too large: ${ex.message}")
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(
            ErrorResponse(
                status = HttpStatus.PAYLOAD_TOO_LARGE.value(),
                error = "Payload Too Large",
                errorCode = "FILE_TOO_LARGE",
                message = "The uploaded file exceeds the maximum allowed size",
                timestamp = Instant.now()
            )
        )
    }

    @ExceptionHandler(Exception::class)
    fun handleGeneral(ex: Exception): ResponseEntity<ErrorResponse> {
        val errorId = UUID.randomUUID().toString().take(8)
        logger.error("Unexpected error [id=$errorId]: ${ex.message}", ex)
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
            ErrorResponse(
                status = HttpStatus.INTERNAL_SERVER_ERROR.value(),
                error = "Internal Server Error",
                errorCode = "INTERNAL_ERROR",
                message = "An unexpected error occurred. Reference: $errorId",
                timestamp = Instant.now(),
                details = mapOf("errorId" to errorId)
            )
        )
    }
}

data class ErrorResponse(
    val status: Int,
    val error: String,
    val errorCode: String,
    val message: String,
    val timestamp: Instant,
    val details: Map<String, String?>? = null,
    val traceId: String? = null
)
