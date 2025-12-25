package com.pim.config

import com.pim.domain.user.User
import io.jsonwebtoken.Claims
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.io.Decoders
import io.jsonwebtoken.security.Keys
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.util.*
import javax.crypto.SecretKey

@Service
class JwtService(
    @Value("\${jwt.secret}")
    private val secretKey: String,

    @Value("\${jwt.expiration}")
    private val jwtExpiration: Long
) {

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
            !isTokenExpired(claims)
        } catch (e: Exception) {
            false
        }
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
