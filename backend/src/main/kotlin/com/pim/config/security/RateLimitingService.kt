package com.pim.config.security

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.stereotype.Service
import java.time.Duration
import java.util.concurrent.ConcurrentHashMap

/**
 * Rate limiting service to prevent brute force and DoS attacks.
 * Supports both Redis (production) and in-memory (development) storage.
 */
@Service
class RateLimitingService(
    private val redisTemplate: StringRedisTemplate?,
    @Value("\${security.rate-limit.requests-per-minute:60}") private val requestsPerMinute: Int,
    @Value("\${security.rate-limit.login-attempts:5}") private val maxLoginAttempts: Int,
    @Value("\${security.rate-limit.lockout-duration-minutes:15}") private val lockoutDurationMinutes: Long
) {
    private val logger = LoggerFactory.getLogger(RateLimitingService::class.java)

    // In-memory fallback storage
    private val rateLimitMap = ConcurrentHashMap<String, RateLimitEntry>()
    private val loginAttemptMap = ConcurrentHashMap<String, LoginAttemptEntry>()

    companion object {
        private const val RATE_LIMIT_PREFIX = "rate:"
        private const val LOGIN_ATTEMPT_PREFIX = "login:"
        private const val LOCKOUT_PREFIX = "lockout:"
    }

    // ==================== General Rate Limiting ====================

    /**
     * Check if a request should be rate limited.
     *
     * @param key Unique identifier (IP address, user ID, etc.)
     * @return true if the request should be allowed, false if rate limited
     */
    fun isAllowed(key: String): Boolean {
        val redisKey = RATE_LIMIT_PREFIX + key
        val now = System.currentTimeMillis()
        val windowStart = now - 60000 // 1 minute window

        return try {
            if (redisTemplate != null) {
                checkRateLimitRedis(redisKey, windowStart, now)
            } else {
                checkRateLimitInMemory(redisKey, windowStart, now)
            }
        } catch (e: Exception) {
            logger.warn("Rate limit check failed, allowing request: ${e.message}")
            true // Fail open to avoid blocking legitimate users
        }
    }

    private fun checkRateLimitRedis(key: String, windowStart: Long, now: Long): Boolean {
        // Using sorted set for sliding window rate limiting
        redisTemplate!!.opsForZSet().removeRangeByScore(key, 0.0, windowStart.toDouble())
        val count = redisTemplate.opsForZSet().size(key) ?: 0

        if (count >= requestsPerMinute) {
            logger.debug("Rate limit exceeded for key: $key")
            return false
        }

        redisTemplate.opsForZSet().add(key, now.toString(), now.toDouble())
        redisTemplate.expire(key, Duration.ofMinutes(2))
        return true
    }

    private fun checkRateLimitInMemory(key: String, windowStart: Long, now: Long): Boolean {
        val entry = rateLimitMap.compute(key) { _, existing ->
            val current = existing ?: RateLimitEntry()
            current.requests.removeIf { it < windowStart }
            current
        }!!

        if (entry.requests.size >= requestsPerMinute) {
            logger.debug("Rate limit exceeded for key: $key (in-memory)")
            return false
        }

        entry.requests.add(now)
        return true
    }

    /**
     * Get remaining requests for a key.
     */
    fun getRemainingRequests(key: String): Int {
        val redisKey = RATE_LIMIT_PREFIX + key
        val windowStart = System.currentTimeMillis() - 60000

        return try {
            if (redisTemplate != null) {
                redisTemplate.opsForZSet().removeRangeByScore(redisKey, 0.0, windowStart.toDouble())
                val count = redisTemplate.opsForZSet().size(redisKey)?.toInt() ?: 0
                maxOf(0, requestsPerMinute - count)
            } else {
                val entry = rateLimitMap[redisKey]
                if (entry != null) {
                    entry.requests.removeIf { it < windowStart }
                    maxOf(0, requestsPerMinute - entry.requests.size)
                } else {
                    requestsPerMinute
                }
            }
        } catch (e: Exception) {
            requestsPerMinute
        }
    }

    // ==================== Login Attempt Tracking ====================

    /**
     * Record a failed login attempt.
     *
     * @param identifier Username or IP address
     * @return Number of remaining attempts before lockout
     */
    fun recordFailedLoginAttempt(identifier: String): Int {
        val key = LOGIN_ATTEMPT_PREFIX + identifier

        return try {
            if (redisTemplate != null) {
                recordFailedAttemptRedis(key, identifier)
            } else {
                recordFailedAttemptInMemory(key, identifier)
            }
        } catch (e: Exception) {
            logger.warn("Failed to record login attempt: ${e.message}")
            maxLoginAttempts
        }
    }

    private fun recordFailedAttemptRedis(key: String, identifier: String): Int {
        val count = redisTemplate!!.opsForValue().increment(key) ?: 1
        redisTemplate.expire(key, Duration.ofMinutes(lockoutDurationMinutes))

        if (count >= maxLoginAttempts) {
            // Lock out the account
            val lockoutKey = LOCKOUT_PREFIX + identifier
            redisTemplate.opsForValue().set(lockoutKey, count.toString(), Duration.ofMinutes(lockoutDurationMinutes))
            logger.warn("Account locked due to too many failed attempts: $identifier")
            return 0
        }

        val remaining = maxLoginAttempts - count.toInt()
        logger.debug("Failed login attempt for $identifier. Remaining: $remaining")
        return remaining
    }

    private fun recordFailedAttemptInMemory(key: String, identifier: String): Int {
        val now = System.currentTimeMillis()
        val windowStart = now - (lockoutDurationMinutes * 60 * 1000)

        val entry = loginAttemptMap.compute(key) { _, existing ->
            val current = existing ?: LoginAttemptEntry()
            current.attempts.removeIf { it < windowStart }
            current.attempts.add(now)
            current
        }!!

        if (entry.attempts.size >= maxLoginAttempts) {
            entry.lockedUntil = now + (lockoutDurationMinutes * 60 * 1000)
            logger.warn("Account locked due to too many failed attempts (in-memory): $identifier")
            return 0
        }

        val remaining = maxLoginAttempts - entry.attempts.size
        logger.debug("Failed login attempt for $identifier (in-memory). Remaining: $remaining")
        return remaining
    }

    /**
     * Record a successful login (clears failed attempts).
     */
    fun recordSuccessfulLogin(identifier: String) {
        val key = LOGIN_ATTEMPT_PREFIX + identifier
        val lockoutKey = LOCKOUT_PREFIX + identifier

        try {
            if (redisTemplate != null) {
                redisTemplate.delete(key)
                redisTemplate.delete(lockoutKey)
            } else {
                loginAttemptMap.remove(key)
            }
            logger.debug("Cleared login attempts for: $identifier")
        } catch (e: Exception) {
            logger.warn("Failed to clear login attempts: ${e.message}")
        }
    }

    /**
     * Check if an account is locked out.
     *
     * @return Remaining lockout time in seconds, or 0 if not locked
     */
    fun getLockoutTimeRemaining(identifier: String): Long {
        val lockoutKey = LOCKOUT_PREFIX + identifier

        return try {
            if (redisTemplate != null) {
                val ttl = redisTemplate.getExpire(lockoutKey)
                if (ttl > 0) ttl else 0
            } else {
                val key = LOGIN_ATTEMPT_PREFIX + identifier
                val entry = loginAttemptMap[key]
                if (entry?.lockedUntil != null && entry.lockedUntil!! > System.currentTimeMillis()) {
                    (entry.lockedUntil!! - System.currentTimeMillis()) / 1000
                } else {
                    0
                }
            }
        } catch (e: Exception) {
            0
        }
    }

    /**
     * Check if an account is currently locked.
     */
    fun isAccountLocked(identifier: String): Boolean {
        return getLockoutTimeRemaining(identifier) > 0
    }

    // ==================== Helper Classes ====================

    private data class RateLimitEntry(
        val requests: MutableList<Long> = mutableListOf()
    )

    private data class LoginAttemptEntry(
        val attempts: MutableList<Long> = mutableListOf(),
        var lockedUntil: Long? = null
    )
}
