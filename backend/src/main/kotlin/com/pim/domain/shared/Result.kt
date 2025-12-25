package com.pim.domain.shared

/**
 * A functional Result type for handling operations that may succeed or fail.
 * Provides a type-safe alternative to exceptions for expected error cases.
 */
sealed class Result<out T, out E> {

    data class Success<T>(val value: T) : Result<T, Nothing>()

    data class Failure<E>(val error: E) : Result<Nothing, E>()

    val isSuccess: Boolean get() = this is Success
    val isFailure: Boolean get() = this is Failure

    fun getOrNull(): T? = when (this) {
        is Success -> value
        is Failure -> null
    }

    fun errorOrNull(): E? = when (this) {
        is Success -> null
        is Failure -> error
    }

    fun getOrThrow(): T = when (this) {
        is Success -> value
        is Failure -> throw IllegalStateException("Result is Failure: $error")
    }

    fun getOrDefault(default: @UnsafeVariance T): @UnsafeVariance T = when (this) {
        is Success -> value
        is Failure -> default
    }

    inline fun <R> map(transform: (T) -> R): Result<R, E> = when (this) {
        is Success -> Success(transform(value))
        is Failure -> Failure(error)
    }

    inline fun <R> flatMap(transform: (T) -> Result<R, @UnsafeVariance E>): Result<R, E> = when (this) {
        is Success -> transform(value)
        is Failure -> Failure(error)
    }

    inline fun <F> mapError(transform: (E) -> F): Result<T, F> = when (this) {
        is Success -> Success(value)
        is Failure -> Failure(transform(error))
    }

    inline fun onSuccess(action: (T) -> Unit): Result<T, E> {
        if (this is Success) action(value)
        return this
    }

    inline fun onFailure(action: (E) -> Unit): Result<T, E> {
        if (this is Failure) action(error)
        return this
    }

    inline fun <R> fold(
        onSuccess: (T) -> R,
        onFailure: (E) -> R
    ): R = when (this) {
        is Success -> onSuccess(value)
        is Failure -> onFailure(error)
    }

    companion object {
        fun <T> success(value: T): Result<T, Nothing> = Success(value)

        fun <E> failure(error: E): Result<Nothing, E> = Failure(error)

        inline fun <T> catch(block: () -> T): Result<T, Throwable> = try {
            Success(block())
        } catch (e: Throwable) {
            Failure(e)
        }

        inline fun <T, E> catchMapped(
            transform: (Throwable) -> E,
            block: () -> T
        ): Result<T, E> = try {
            Success(block())
        } catch (e: Throwable) {
            Failure(transform(e))
        }
    }
}

/**
 * Type alias for Result with DomainException as error type
 */
typealias DomainResult<T> = Result<T, DomainException>

/**
 * Extension functions for working with lists of Results
 */
fun <T, E> List<Result<T, E>>.sequence(): Result<List<T>, E> {
    val results = mutableListOf<T>()
    for (result in this) {
        when (result) {
            is Result.Success -> results.add(result.value)
            is Result.Failure -> return Result.Failure(result.error)
        }
    }
    return Result.Success(results)
}

fun <T, E> List<Result<T, E>>.partition(): Pair<List<T>, List<E>> {
    val successes = mutableListOf<T>()
    val failures = mutableListOf<E>()
    for (result in this) {
        when (result) {
            is Result.Success -> successes.add(result.value)
            is Result.Failure -> failures.add(result.error)
        }
    }
    return Pair(successes, failures)
}

/**
 * Convert nullable to Result
 */
fun <T, E> T?.toResult(error: () -> E): Result<T, E> =
    if (this != null) Result.Success(this) else Result.Failure(error())

/**
 * Validation builder for accumulating errors
 */
class ValidationBuilder {
    private val errors = mutableListOf<ValidationError>()

    fun require(condition: Boolean, field: String, message: String, rejectedValue: Any? = null) {
        if (!condition) {
            errors.add(ValidationError(field, message, rejectedValue))
        }
    }

    fun requireNotBlank(value: String?, field: String, message: String = "$field is required") {
        if (value.isNullOrBlank()) {
            errors.add(ValidationError(field, message, value))
        }
    }

    fun requirePositive(value: Number?, field: String, message: String = "$field must be positive") {
        if (value == null || value.toDouble() <= 0) {
            errors.add(ValidationError(field, message, value))
        }
    }

    fun requireInRange(value: Number?, field: String, min: Number, max: Number, message: String? = null) {
        if (value == null || value.toDouble() < min.toDouble() || value.toDouble() > max.toDouble()) {
            errors.add(ValidationError(
                field,
                message ?: "$field must be between $min and $max",
                value
            ))
        }
    }

    fun requirePattern(value: String?, field: String, pattern: Regex, message: String) {
        if (value != null && !pattern.matches(value)) {
            errors.add(ValidationError(field, message, value))
        }
    }

    fun requireMaxLength(value: String?, field: String, maxLength: Int, message: String? = null) {
        if (value != null && value.length > maxLength) {
            errors.add(ValidationError(
                field,
                message ?: "$field must not exceed $maxLength characters",
                value
            ))
        }
    }

    fun addError(field: String, message: String, rejectedValue: Any? = null) {
        errors.add(ValidationError(field, message, rejectedValue))
    }

    fun <T> build(value: T): DomainResult<T> = when {
        errors.isEmpty() -> Result.Success(value)
        errors.size == 1 -> Result.Failure(
            ValidationException(errors[0].message, errors[0].field, errors[0].rejectedValue)
        )
        else -> Result.Failure(MultipleValidationException(errors.toList()))
    }

    fun hasErrors(): Boolean = errors.isNotEmpty()

    fun getErrors(): List<ValidationError> = errors.toList()
}

inline fun <T> validate(value: T, block: ValidationBuilder.() -> Unit): DomainResult<T> {
    val builder = ValidationBuilder()
    builder.block()
    return builder.build(value)
}
