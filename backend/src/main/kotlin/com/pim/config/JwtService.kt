package com.pim.config

import com.pim.config.security.JwtBlacklistService
import com.pim.domain.user.User
import io.jsonwebtoken.Claims
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.io.Decoders
import io.jsonwebtoken.security.Keys
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.util.*
import javax.crypto.SecretKey

@Service
class JwtService(
    @Value("\${jwt.secret}")
    private val secretKey: String,

    @Value("\${jwt.expiration}")
    private val jwtExpiration: Long,

    private val jwtBlacklistService: JwtBlacklistService
) {
    private val logger = LoggerFactory.getLogger(JwtService::class.java)

    init {
        // SECURITY: Validate JWT secret key strength at startup
        validateSecretKey()
    }

    private fun validateSecretKey() {
        try {
            val keyBytes = Decoders.BASE64.decode(secretKey)
            if (keyBytes.size < 32) { // 256 bits minimum
                logger.warn("JWT secret key is less than 256 bits. This is insecure for production!")
            }
        } catch (e: Exception) {
            logger.error("Invalid JWT secret key format: ${e.message}")
            throw IllegalStateException("JWT secret key must be a valid Base64 encoded string of at least 256 bits")
        }
    }

    fun generateToken(user: User): String {
        return generateToken(user, jwtExpiration)
    }

    fun generateRefreshToken(user: User): String {
        return generateToken(user, jwtExpiration * 7) // 7x longer for refresh token
    }

    private fun generateToken(user: User, expiration: Long): String {
        val now = Date()
        val expiryDate = Date(now.time + expiration)

        return Jwts.builder()
            .subject(user.id.toString())
            .claim("email", user.email)
            .claim("roles", user.roles.map { it.name })
            .claim("iat_ms", now.time) // Store issued at in milliseconds for blacklist check
            .issuedAt(now)
            .expiration(expiryDate)
            .signWith(getSigningKey())
            .compact()
    }

    fun extractUserId(token: String): UUID? {
        return try {
            val claims = extractAllClaims(token)
            UUID.fromString(claims.subject)
        } catch (e: Exception) {
            null
        }
    }

    fun extractEmail(token: String): String? {
        return try {
            val claims = extractAllClaims(token)
            claims["email"] as? String
        } catch (e: Exception) {
            null
        }
    }

    @Suppress("UNCHECKED_CAST")
    fun extractRoles(token: String): List<String> {
        return try {
            val claims = extractAllClaims(token)
            claims["roles"] as? List<String> ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun isTokenValid(token: String): Boolean {
        return try {
            val claims = extractAllClaims(token)

            // Check if token is expired
            if (isTokenExpired(claims)) {
                logger.debug("Token is expired")
                return false
            }

            // SECURITY: Check if token is blacklisted
            if (jwtBlacklistService.isBlacklisted(token)) {
                logger.debug("Token is blacklisted")
                return false
            }

            // SECURITY: Check if user's tokens were invalidated (e.g., password change)
            val userId = claims.subject
            val issuedAt = claims["iat_ms"] as? Long ?: claims.issuedAt.time
            if (userId != null && jwtBlacklistService.isTokenInvalidatedForUser(userId, issuedAt)) {
                logger.debug("Token was invalidated for user: $userId")
                return false
            }

            true
        } catch (e: Exception) {
            logger.debug("Token validation failed: ${e.message}")
            false
        }
    }

    /**
     * Blacklist a token (for logout)
     */
    fun blacklistToken(token: String, userId: String? = null) {
        try {
            val claims = extractAllClaims(token)
            val expiration = claims.expiration
            val remainingTtl = expiration.time - System.currentTimeMillis()
            if (remainingTtl > 0) {
                jwtBlacklistService.blacklistToken(token, userId, remainingTtl)
                logger.info("Token blacklisted for user: $userId")
            }
        } catch (e: Exception) {
            // Token might already be invalid, but still try to blacklist it
            jwtBlacklistService.blacklistToken(token, userId)
            logger.warn("Could not parse token for blacklisting, using default TTL")
        }
    }

    /**
     * Invalidate all tokens for a user (for password change, force logout)
     */
    fun invalidateAllUserTokens(userId: String) {
        jwtBlacklistService.blacklistAllUserTokens(userId)
        logger.info("All tokens invalidated for user: $userId")
    }

    private fun isTokenExpired(claims: Claims): Boolean {
        return claims.expiration.before(Date())
    }

    private fun extractAllClaims(token: String): Claims {
        return Jwts.parser()
            .verifyWith(getSigningKey())
            .build()
            .parseSignedClaims(token)
            .payload
    }

    private fun getSigningKey(): SecretKey {
        val keyBytes = Decoders.BASE64.decode(secretKey)
        return Keys.hmacShaKeyFor(keyBytes)
    }
}
