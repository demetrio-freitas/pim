package com.pim.domain.shared

import java.util.UUID

/**
 * Base sealed class for all domain exceptions.
 * Provides structured error handling with type safety.
 */
sealed class DomainException(
    override val message: String,
    val errorCode: String,
    val details: Map<String, Any?> = emptyMap()
) : RuntimeException(message)

// ============================================
// Entity Not Found Exceptions
// ============================================

sealed class EntityNotFoundException(
    entityType: String,
    identifier: String,
    details: Map<String, Any?> = emptyMap()
) : DomainException(
    message = "$entityType not found with identifier: $identifier",
    errorCode = "${entityType.uppercase()}_NOT_FOUND",
    details = details + mapOf("entityType" to entityType, "identifier" to identifier)
)

class ProductNotFoundException(id: UUID) : EntityNotFoundException("Product", id.toString())
class ProductNotFoundBySkuException(sku: String) : EntityNotFoundException("Product", sku, mapOf("searchField" to "sku"))
class CategoryNotFoundException(id: UUID) : EntityNotFoundException("Category", id.toString())
class AttributeNotFoundException(id: UUID) : EntityNotFoundException("Attribute", id.toString())
class AttributeNotFoundByCodeException(code: String) : EntityNotFoundException("Attribute", code, mapOf("searchField" to "code"))
class FamilyNotFoundException(id: UUID) : EntityNotFoundException("Family", id.toString())
class ChannelNotFoundException(id: UUID) : EntityNotFoundException("Channel", id.toString())
class UserNotFoundException(id: UUID) : EntityNotFoundException("User", id.toString())
class UserNotFoundByEmailException(email: String) : EntityNotFoundException("User", email, mapOf("searchField" to "email"))
class QualityRuleNotFoundException(id: UUID) : EntityNotFoundException("QualityRule", id.toString())
class VariantAxisNotFoundException(id: UUID) : EntityNotFoundException("VariantAxis", id.toString())
class MediaNotFoundException(id: UUID) : EntityNotFoundException("Media", id.toString())

// ============================================
// Validation Exceptions
// ============================================

class ValidationException(
    message: String,
    val field: String? = null,
    val rejectedValue: Any? = null,
    details: Map<String, Any?> = emptyMap()
) : DomainException(
    message = message,
    errorCode = "VALIDATION_ERROR",
    details = details + mapOfNotNull(
        "field" to field,
        "rejectedValue" to rejectedValue
    )
)

class MultipleValidationException(
    val errors: List<ValidationError>
) : DomainException(
    message = "Multiple validation errors occurred",
    errorCode = "MULTIPLE_VALIDATION_ERRORS",
    details = mapOf("errors" to errors.map { mapOf("field" to it.field, "message" to it.message) })
)

data class ValidationError(
    val field: String,
    val message: String,
    val rejectedValue: Any? = null
)

// ============================================
// Business Rule Exceptions
// ============================================

sealed class BusinessRuleException(
    message: String,
    errorCode: String,
    details: Map<String, Any?> = emptyMap()
) : DomainException(message, errorCode, details)

class DuplicateEntityException(
    entityType: String,
    field: String,
    value: String
) : BusinessRuleException(
    message = "$entityType with $field '$value' already exists",
    errorCode = "${entityType.uppercase()}_DUPLICATE",
    details = mapOf("entityType" to entityType, "field" to field, "value" to value)
)

class ProductAlreadyExistsException(sku: String) : BusinessRuleException(
    message = "Product with SKU '$sku' already exists",
    errorCode = "PRODUCT_DUPLICATE_SKU",
    details = mapOf("sku" to sku)
)

class CategoryAlreadyExistsException(code: String) : BusinessRuleException(
    message = "Category with code '$code' already exists",
    errorCode = "CATEGORY_DUPLICATE_CODE",
    details = mapOf("code" to code)
)

class AttributeAlreadyExistsException(code: String) : BusinessRuleException(
    message = "Attribute with code '$code' already exists",
    errorCode = "ATTRIBUTE_DUPLICATE_CODE",
    details = mapOf("code" to code)
)

class EmailAlreadyExistsException(email: String) : BusinessRuleException(
    message = "User with email '$email' already exists",
    errorCode = "EMAIL_DUPLICATE",
    details = mapOf("email" to email)
)

class InvalidStateTransitionException(
    entityType: String,
    currentState: String,
    targetState: String
) : BusinessRuleException(
    message = "Cannot transition $entityType from '$currentState' to '$targetState'",
    errorCode = "INVALID_STATE_TRANSITION",
    details = mapOf("entityType" to entityType, "currentState" to currentState, "targetState" to targetState)
)

class InsufficientCompletenessException(
    productId: UUID,
    requiredScore: Int,
    actualScore: Int
) : BusinessRuleException(
    message = "Product completeness ($actualScore%) is below required minimum ($requiredScore%)",
    errorCode = "INSUFFICIENT_COMPLETENESS",
    details = mapOf("productId" to productId, "requiredScore" to requiredScore, "actualScore" to actualScore)
)

class ChannelRequirementsNotMetException(
    productId: UUID,
    channelId: UUID,
    missingAttributes: List<String>
) : BusinessRuleException(
    message = "Product does not meet channel requirements. Missing attributes: ${missingAttributes.joinToString(", ")}",
    errorCode = "CHANNEL_REQUIREMENTS_NOT_MET",
    details = mapOf("productId" to productId, "channelId" to channelId, "missingAttributes" to missingAttributes)
)

class CircularReferenceException(
    entityType: String,
    entityId: UUID
) : BusinessRuleException(
    message = "Circular reference detected in $entityType hierarchy",
    errorCode = "CIRCULAR_REFERENCE",
    details = mapOf("entityType" to entityType, "entityId" to entityId)
)

class CannotDeleteInUseException(
    entityType: String,
    entityId: UUID,
    usedBy: String,
    usageCount: Int
) : BusinessRuleException(
    message = "Cannot delete $entityType: it is used by $usageCount $usedBy",
    errorCode = "${entityType.uppercase()}_IN_USE",
    details = mapOf("entityType" to entityType, "entityId" to entityId, "usedBy" to usedBy, "usageCount" to usageCount)
)

// ============================================
// Authentication/Authorization Exceptions
// ============================================

sealed class AuthException(
    message: String,
    errorCode: String,
    details: Map<String, Any?> = emptyMap()
) : DomainException(message, errorCode, details)

class InvalidCredentialsException : AuthException(
    message = "Invalid email or password",
    errorCode = "INVALID_CREDENTIALS"
)

class AccountDisabledException(userId: UUID) : AuthException(
    message = "User account is disabled",
    errorCode = "ACCOUNT_DISABLED",
    details = mapOf("userId" to userId)
)

class TokenExpiredException : AuthException(
    message = "Authentication token has expired",
    errorCode = "TOKEN_EXPIRED"
)

class InvalidTokenException : AuthException(
    message = "Invalid authentication token",
    errorCode = "INVALID_TOKEN"
)

class InsufficientPermissionsException(
    requiredPermission: String,
    resource: String? = null
) : AuthException(
    message = "Insufficient permissions to perform this action",
    errorCode = "INSUFFICIENT_PERMISSIONS",
    details = mapOfNotNull("requiredPermission" to requiredPermission, "resource" to resource)
)

class PasswordMismatchException : AuthException(
    message = "Current password is incorrect",
    errorCode = "PASSWORD_MISMATCH"
)

// ============================================
// Import/Export Exceptions
// ============================================

sealed class DataTransferException(
    message: String,
    errorCode: String,
    details: Map<String, Any?> = emptyMap()
) : DomainException(message, errorCode, details)

class ImportValidationException(
    val rowNumber: Int,
    val errors: List<String>
) : DataTransferException(
    message = "Import validation failed at row $rowNumber",
    errorCode = "IMPORT_VALIDATION_ERROR",
    details = mapOf("rowNumber" to rowNumber, "errors" to errors)
)

class UnsupportedFileFormatException(format: String) : DataTransferException(
    message = "Unsupported file format: $format",
    errorCode = "UNSUPPORTED_FILE_FORMAT",
    details = mapOf("format" to format)
)

class FileTooLargeException(
    sizeBytes: Long,
    maxSizeBytes: Long
) : DataTransferException(
    message = "File size exceeds maximum allowed size",
    errorCode = "FILE_TOO_LARGE",
    details = mapOf("sizeBytes" to sizeBytes, "maxSizeBytes" to maxSizeBytes)
)

// ============================================
// Quality Rule Exceptions
// ============================================

class QualityRuleViolationException(
    productId: UUID,
    violations: List<QualityViolation>
) : BusinessRuleException(
    message = "Product violates ${violations.size} quality rule(s)",
    errorCode = "QUALITY_RULE_VIOLATION",
    details = mapOf("productId" to productId, "violations" to violations.map {
        mapOf("ruleCode" to it.ruleCode, "severity" to it.severity, "message" to it.message)
    })
)

data class QualityViolation(
    val ruleCode: String,
    val severity: String,
    val message: String,
    val attributeCode: String? = null
)

// ============================================
// Utility Extensions
// ============================================

private fun <K, V> mapOfNotNull(vararg pairs: Pair<K, V?>): Map<K, V> {
    return pairs.filter { it.second != null }.associate { it.first to it.second!! }
}
