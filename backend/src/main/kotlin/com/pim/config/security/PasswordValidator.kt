package com.pim.config.security

import jakarta.validation.Constraint
import jakarta.validation.ConstraintValidator
import jakarta.validation.ConstraintValidatorContext
import jakarta.validation.Payload
import kotlin.reflect.KClass

/**
 * Custom annotation for password validation with complexity requirements.
 */
@Target(AnnotationTarget.FIELD, AnnotationTarget.VALUE_PARAMETER)
@Retention(AnnotationRetention.RUNTIME)
@Constraint(validatedBy = [PasswordConstraintValidator::class])
@MustBeDocumented
annotation class ValidPassword(
    val message: String = "Password does not meet security requirements",
    val groups: Array<KClass<*>> = [],
    val payload: Array<KClass<out Payload>> = []
)

/**
 * Validator for password complexity requirements.
 */
class PasswordConstraintValidator : ConstraintValidator<ValidPassword, String> {

    companion object {
        const val MIN_LENGTH = 8
        const val MAX_LENGTH = 128

        // Common weak passwords to reject
        private val COMMON_PASSWORDS = setOf(
            "password", "password1", "password123", "12345678", "123456789",
            "qwerty123", "admin123", "letmein", "welcome", "monkey",
            "dragon", "master", "1234567890", "abc123", "password1!",
            "admin", "administrator", "root", "user", "test"
        )
    }

    override fun isValid(password: String?, context: ConstraintValidatorContext): Boolean {
        if (password == null) {
            return false
        }

        val violations = mutableListOf<String>()

        // Check length
        if (password.length < MIN_LENGTH) {
            violations.add("must be at least $MIN_LENGTH characters")
        }
        if (password.length > MAX_LENGTH) {
            violations.add("must not exceed $MAX_LENGTH characters")
        }

        // Check for uppercase letter
        if (!password.any { it.isUpperCase() }) {
            violations.add("must contain at least one uppercase letter")
        }

        // Check for lowercase letter
        if (!password.any { it.isLowerCase() }) {
            violations.add("must contain at least one lowercase letter")
        }

        // Check for digit
        if (!password.any { it.isDigit() }) {
            violations.add("must contain at least one number")
        }

        // Check for special character
        val specialChars = "!@#\$%^&*()_+-=[]{}|;':\",./<>?"
        if (!password.any { it in specialChars }) {
            violations.add("must contain at least one special character (!@#\$%^&*...)")
        }

        // Check for common passwords
        if (password.lowercase() in COMMON_PASSWORDS) {
            violations.add("is too common and easily guessable")
        }

        // Check for repeated characters (e.g., "aaaa")
        if (hasRepeatedCharacters(password, 4)) {
            violations.add("must not contain 4 or more repeated characters")
        }

        // Check for sequential characters (e.g., "1234", "abcd")
        if (hasSequentialCharacters(password, 4)) {
            violations.add("must not contain 4 or more sequential characters")
        }

        if (violations.isNotEmpty()) {
            context.disableDefaultConstraintViolation()
            context.buildConstraintViolationWithTemplate(
                "Password ${violations.joinToString(", ")}"
            ).addConstraintViolation()
            return false
        }

        return true
    }

    private fun hasRepeatedCharacters(password: String, threshold: Int): Boolean {
        var count = 1
        for (i in 1 until password.length) {
            if (password[i] == password[i - 1]) {
                count++
                if (count >= threshold) return true
            } else {
                count = 1
            }
        }
        return false
    }

    private fun hasSequentialCharacters(password: String, threshold: Int): Boolean {
        if (password.length < threshold) return false

        var ascCount = 1
        var descCount = 1

        for (i in 1 until password.length) {
            val diff = password[i].code - password[i - 1].code

            if (diff == 1) {
                ascCount++
                descCount = 1
            } else if (diff == -1) {
                descCount++
                ascCount = 1
            } else {
                ascCount = 1
                descCount = 1
            }

            if (ascCount >= threshold || descCount >= threshold) return true
        }

        return false
    }
}

/**
 * Utility class for password validation without annotation.
 */
object PasswordValidationUtils {

    data class ValidationResult(
        val isValid: Boolean,
        val errors: List<String>
    )

    fun validate(password: String): ValidationResult {
        val errors = mutableListOf<String>()

        if (password.length < PasswordConstraintValidator.MIN_LENGTH) {
            errors.add("Password must be at least ${PasswordConstraintValidator.MIN_LENGTH} characters")
        }

        if (!password.any { it.isUpperCase() }) {
            errors.add("Password must contain at least one uppercase letter")
        }

        if (!password.any { it.isLowerCase() }) {
            errors.add("Password must contain at least one lowercase letter")
        }

        if (!password.any { it.isDigit() }) {
            errors.add("Password must contain at least one number")
        }

        val specialChars = "!@#\$%^&*()_+-=[]{}|;':\",./<>?"
        if (!password.any { it in specialChars }) {
            errors.add("Password must contain at least one special character")
        }

        return ValidationResult(errors.isEmpty(), errors)
    }
}
