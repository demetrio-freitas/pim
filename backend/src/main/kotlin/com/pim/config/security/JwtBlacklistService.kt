package com.pim.config.security

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.stereotype.Service
import java.time.Duration
import java.util.concurrent.ConcurrentHashMap

/**
 * Service for managing JWT token blacklist.
 * Supports both Redis (production) and in-memory (development) storage.
 * Tokens are automatically expired based on JWT expiration time.
 */
@Service
class JwtBlacklistService(
    private val redisTemplate: StringRedisTemplate?,
    @Value("\${jwt.expiration:86400000}") private val jwtExpiration: Long
) {
    private val logger = LoggerFactory.getLogger(JwtBlacklistService::class.java)

    // Fallback in-memory storage when Redis is not available
    private val inMemoryBlacklist = ConcurrentHashMap<String, Long>()

    companion object {
        private const val BLACKLIST_PREFIX = "jwt:blacklist:"
        private const val USER_TOKENS_PREFIX = "jwt:user:"
    }

    /**
     * Add a token to the blacklist.
     * The token will be automatically removed after it expires.
     *
     * @param token The JWT token to blacklist
     * @param userId The user ID associated with the token
     * @param remainingTtlMs Time until token expires in milliseconds (optional, defaults to jwt.expiration)
     */
    fun blacklistToken(token: String, userId: String? = null, remainingTtlMs: Long? = null) {
        val ttl = remainingTtlMs ?: jwtExpiration
        val key = BLACKLIST_PREFIX + hashToken(token)

        try {
            if (redisTemplate != null) {
                redisTemplate.opsForValue().set(key, userId ?: "unknown", Duration.ofMillis(ttl))
                logger.debug("Token blacklisted in Redis for user: $userId")
            } else {
                // Fallback to in-memory
                val expirationTime = System.currentTimeMillis() + ttl
                inMemoryBlacklist[key] = expirationTime
                cleanupExpiredTokens()
                logger.debug("Token blacklisted in memory for user: $userId")
            }
        } catch (e: Exception) {
            logger.warn("Failed to blacklist token in Redis, using in-memory fallback: ${e.message}")
            val expirationTime = System.currentTimeMillis() + ttl
            inMemoryBlacklist[key] = expirationTime
        }
    }

    /**
     * Check if a token is blacklisted.
     *
     * @param token The JWT token to check
     * @return true if the token is blacklisted, false otherwise
     */
    fun isBlacklisted(token: String): Boolean {
        val key = BLACKLIST_PREFIX + hashToken(token)

        return try {
            if (redisTemplate != null) {
                val exists = redisTemplate.hasKey(key)
                if (exists) {
                    logger.debug("Token found in Redis blacklist")
                }
                exists
            } else {
                // Fallback to in-memory
                cleanupExpiredTokens()
                val expiration = inMemoryBlacklist[key]
                val isBlacklisted = expiration != null && expiration > System.currentTimeMillis()
                if (isBlacklisted) {
                    logger.debug("Token found in memory blacklist")
                }
                isBlacklisted
            }
        } catch (e: Exception) {
            logger.warn("Failed to check token blacklist in Redis: ${e.message}")
            // Check in-memory as fallback
            cleanupExpiredTokens()
            val expiration = inMemoryBlacklist[key]
            expiration != null && expiration > System.currentTimeMillis()
        }
    }

    /**
     * Blacklist all tokens for a user (useful for password change, force logout)
     *
     * @param userId The user ID whose tokens should be invalidated
     */
    fun blacklistAllUserTokens(userId: String) {
        val key = USER_TOKENS_PREFIX + userId
        val timestamp = System.currentTimeMillis().toString()

        try {
            if (redisTemplate != null) {
                // Store the timestamp when all tokens were invalidated
                // Any token issued before this timestamp is invalid
                redisTemplate.opsForValue().set(key, timestamp, Duration.ofMillis(jwtExpiration * 2))
                logger.info("All tokens invalidated for user: $userId")
            } else {
                inMemoryBlacklist["user:$userId"] = System.currentTimeMillis() + (jwtExpiration * 2)
                logger.info("All tokens invalidated for user (in-memory): $userId")
            }
        } catch (e: Exception) {
            logger.warn("Failed to invalidate user tokens: ${e.message}")
            inMemoryBlacklist["user:$userId"] = System.currentTimeMillis() + (jwtExpiration * 2)
        }
    }

    /**
     * Check if a token was issued before user's tokens were invalidated
     *
     * @param userId The user ID
     * @param tokenIssuedAt When the token was issued (in milliseconds)
     * @return true if token was issued before invalidation, false otherwise
     */
    fun isTokenInvalidatedForUser(userId: String, tokenIssuedAt: Long): Boolean {
        val key = USER_TOKENS_PREFIX + userId

        return try {
            if (redisTemplate != null) {
                val invalidationTime = redisTemplate.opsForValue().get(key)?.toLongOrNull()
                invalidationTime != null && tokenIssuedAt < invalidationTime
            } else {
                val expiration = inMemoryBlacklist["user:$userId"]
                expiration != null && tokenIssuedAt < (expiration - (jwtExpiration * 2))
            }
        } catch (e: Exception) {
            logger.warn("Failed to check user token invalidation: ${e.message}")
            false
        }
    }

    /**
     * Get the count of blacklisted tokens (for monitoring)
     */
    fun getBlacklistCount(): Long {
        return try {
            if (redisTemplate != null) {
                val keys = redisTemplate.keys("$BLACKLIST_PREFIX*")
                keys?.size?.toLong() ?: 0
            } else {
                cleanupExpiredTokens()
                inMemoryBlacklist.size.toLong()
            }
        } catch (e: Exception) {
            logger.warn("Failed to get blacklist count: ${e.message}")
            inMemoryBlacklist.size.toLong()
        }
    }

    /**
     * Hash the token for storage (don't store raw tokens)
     */
    private fun hashToken(token: String): String {
        return java.security.MessageDigest.getInstance("SHA-256")
            .digest(token.toByteArray())
            .fold("") { str, byte -> str + "%02x".format(byte) }
            .take(32) // First 32 chars is enough for uniqueness
    }

    /**
     * Cleanup expired tokens from in-memory storage
     */
    private fun cleanupExpiredTokens() {
        val now = System.currentTimeMillis()
        inMemoryBlacklist.entries.removeIf { it.value < now }
    }
}
