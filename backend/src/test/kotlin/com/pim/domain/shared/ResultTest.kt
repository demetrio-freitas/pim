package com.pim.domain.shared

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ResultTest {

    @Test
    fun `success should hold value`() {
        val result = Result.success("hello")

        assertTrue(result.isSuccess)
        assertFalse(result.isFailure)
        assertEquals("hello", result.getOrNull())
        assertNull(result.errorOrNull())
    }

    @Test
    fun `failure should hold error`() {
        val error = ValidationException("Invalid input", "field")
        val result = Result.failure(error)

        assertFalse(result.isSuccess)
        assertTrue(result.isFailure)
        assertNull(result.getOrNull())
        assertEquals(error, result.errorOrNull())
    }

    @Test
    fun `getOrThrow should return value for success`() {
        val result = Result.success(42)
        assertEquals(42, result.getOrThrow())
    }

    @Test
    fun `getOrThrow should throw for failure`() {
        val result = Result.failure(ValidationException("error"))
        assertThrows<IllegalStateException> { result.getOrThrow() }
    }

    @Test
    fun `getOrDefault should return value for success`() {
        val result = Result.success(42)
        assertEquals(42, result.getOrDefault(0))
    }

    @Test
    fun `getOrDefault should return default for failure`() {
        val result: Result<Int, ValidationException> = Result.failure(ValidationException("error"))
        assertEquals(0, result.getOrDefault(0))
    }

    @Test
    fun `map should transform success value`() {
        val result = Result.success(10)
        val mapped = result.map { it * 2 }

        assertEquals(20, mapped.getOrNull())
    }

    @Test
    fun `map should propagate failure`() {
        val error = ValidationException("error")
        val result: Result<Int, ValidationException> = Result.failure(error)
        val mapped = result.map { it * 2 }

        assertTrue(mapped.isFailure)
        assertEquals(error, mapped.errorOrNull())
    }

    @Test
    fun `flatMap should chain operations`() {
        val result = Result.success(10)
        val flatMapped = result.flatMap { value ->
            if (value > 5) Result.success(value * 2)
            else Result.failure(ValidationException("too small"))
        }

        assertEquals(20, flatMapped.getOrNull())
    }

    @Test
    fun `flatMap should stop on first failure`() {
        val result = Result.success(3)
        val flatMapped = result.flatMap { value ->
            if (value > 5) Result.success(value * 2)
            else Result.failure(ValidationException("too small"))
        }

        assertTrue(flatMapped.isFailure)
    }

    @Test
    fun `mapError should transform error`() {
        val result: Result<Int, String> = Result.failure("error")
        val mapped = result.mapError { ValidationException(it) }

        assertTrue(mapped.isFailure)
        assertTrue(mapped.errorOrNull() is ValidationException)
    }

    @Test
    fun `onSuccess should execute action for success`() {
        var executed = false
        val result = Result.success(42)

        result.onSuccess { executed = true }

        assertTrue(executed)
    }

    @Test
    fun `onSuccess should not execute action for failure`() {
        var executed = false
        val result: Result<Int, String> = Result.failure("error")

        result.onSuccess { executed = true }

        assertFalse(executed)
    }

    @Test
    fun `onFailure should execute action for failure`() {
        var executed = false
        val result: Result<Int, String> = Result.failure("error")

        result.onFailure { executed = true }

        assertTrue(executed)
    }

    @Test
    fun `fold should apply success function for success`() {
        val result = Result.success(10)
        val folded = result.fold(
            onSuccess = { it * 2 },
            onFailure = { -1 }
        )

        assertEquals(20, folded)
    }

    @Test
    fun `fold should apply failure function for failure`() {
        val result: Result<Int, String> = Result.failure("error")
        val folded = result.fold(
            onSuccess = { it * 2 },
            onFailure = { -1 }
        )

        assertEquals(-1, folded)
    }

    @Test
    fun `catch should return success for non-throwing block`() {
        val result = Result.catch { 42 }

        assertTrue(result.isSuccess)
        assertEquals(42, result.getOrNull())
    }

    @Test
    fun `catch should return failure for throwing block`() {
        val result = Result.catch { throw IllegalArgumentException("error") }

        assertTrue(result.isFailure)
        assertTrue(result.errorOrNull() is IllegalArgumentException)
    }

    @Test
    fun `sequence should return success list when all succeed`() {
        val results = listOf(
            Result.success(1),
            Result.success(2),
            Result.success(3)
        )

        val sequenced = results.sequence()

        assertTrue(sequenced.isSuccess)
        assertEquals(listOf(1, 2, 3), sequenced.getOrNull())
    }

    @Test
    fun `sequence should return first failure`() {
        val error = "second failed"
        val results = listOf(
            Result.success(1),
            Result.failure(error),
            Result.success(3)
        )

        val sequenced = results.sequence()

        assertTrue(sequenced.isFailure)
        assertEquals(error, sequenced.errorOrNull())
    }

    @Test
    fun `partition should separate successes and failures`() {
        val results = listOf(
            Result.success(1),
            Result.failure("error1"),
            Result.success(2),
            Result.failure("error2")
        )

        val (successes, failures) = results.partition()

        assertEquals(listOf(1, 2), successes)
        assertEquals(listOf("error1", "error2"), failures)
    }

    @Test
    fun `toResult should convert non-null to success`() {
        val value: String? = "hello"
        val result = value.toResult { "was null" }

        assertTrue(result.isSuccess)
        assertEquals("hello", result.getOrNull())
    }

    @Test
    fun `toResult should convert null to failure`() {
        val value: String? = null
        val result = value.toResult { "was null" }

        assertTrue(result.isFailure)
        assertEquals("was null", result.errorOrNull())
    }
}

class ValidationBuilderTest {

    @Test
    fun `validate should return success when no errors`() {
        data class User(val name: String, val age: Int)
        val user = User("John", 25)

        val result = validate(user) {
            requireNotBlank(user.name, "name")
            requirePositive(user.age, "age")
        }

        assertTrue(result.isSuccess)
        assertEquals(user, result.getOrNull())
    }

    @Test
    fun `validate should return single ValidationException for one error`() {
        data class User(val name: String, val age: Int)
        val user = User("", 25)

        val result = validate(user) {
            requireNotBlank(user.name, "name")
        }

        assertTrue(result.isFailure)
        assertTrue(result.errorOrNull() is ValidationException)
    }

    @Test
    fun `validate should return MultipleValidationException for multiple errors`() {
        data class User(val name: String, val age: Int)
        val user = User("", -5)

        val result = validate(user) {
            requireNotBlank(user.name, "name")
            requirePositive(user.age, "age")
        }

        assertTrue(result.isFailure)
        assertTrue(result.errorOrNull() is MultipleValidationException)
        val errors = (result.errorOrNull() as MultipleValidationException).errors
        assertEquals(2, errors.size)
    }

    @Test
    fun `requireInRange should validate range`() {
        val result = validate(150) {
            requireInRange(150, "value", 0, 100)
        }

        assertTrue(result.isFailure)
    }

    @Test
    fun `requirePattern should validate regex`() {
        val email = "invalid-email"
        val result = validate(email) {
            requirePattern(email, "email", Regex("^[A-Za-z0-9+_.-]+@(.+)$"), "Invalid email format")
        }

        assertTrue(result.isFailure)
    }

    @Test
    fun `requireMaxLength should validate length`() {
        val result = validate("a".repeat(300)) {
            requireMaxLength("a".repeat(300), "field", 255)
        }

        assertTrue(result.isFailure)
    }
}
