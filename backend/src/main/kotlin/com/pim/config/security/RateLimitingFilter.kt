package com.pim.config.security

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.core.Ordered
import org.springframework.core.annotation.Order
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

/**
 * Filter to apply rate limiting to incoming requests.
 * Uses IP address for anonymous requests and user ID for authenticated requests.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
class RateLimitingFilter(
    private val rateLimitingService: RateLimitingService
) : OncePerRequestFilter() {

    companion object {
        // Paths that should have stricter rate limiting
        private val STRICT_RATE_LIMIT_PATHS = setOf(
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/refresh"
        )

        // Paths that are exempt from rate limiting
        private val EXEMPT_PATHS = setOf(
            "/actuator/health",
            "/actuator/info",
            "/swagger-ui",
            "/api-docs"
        )
    }

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val path = request.requestURI

        // Skip rate limiting for exempt paths
        if (EXEMPT_PATHS.any { path.startsWith(it) }) {
            filterChain.doFilter(request, response)
            return
        }

        // Get client identifier (IP address)
        val clientId = getClientIp(request)

        // Apply stricter limits for sensitive endpoints
        val isStrictPath = STRICT_RATE_LIMIT_PATHS.any { path.startsWith(it) }
        val rateLimitKey = if (isStrictPath) "strict:$clientId:$path" else clientId

        // Check rate limit
        if (!rateLimitingService.isAllowed(rateLimitKey)) {
            sendRateLimitResponse(response, clientId)
            return
        }

        // Add rate limit headers
        val remaining = rateLimitingService.getRemainingRequests(rateLimitKey)
        response.setHeader("X-RateLimit-Limit", "60")
        response.setHeader("X-RateLimit-Remaining", remaining.toString())
        response.setHeader("X-RateLimit-Reset", ((System.currentTimeMillis() / 1000) + 60).toString())

        filterChain.doFilter(request, response)
    }

    private fun getClientIp(request: HttpServletRequest): String {
        // Check for forwarded headers (when behind proxy/load balancer)
        val forwardedFor = request.getHeader("X-Forwarded-For")
        if (!forwardedFor.isNullOrBlank()) {
            // Take the first IP (original client)
            return forwardedFor.split(",").first().trim()
        }

        val realIp = request.getHeader("X-Real-IP")
        if (!realIp.isNullOrBlank()) {
            return realIp.trim()
        }

        return request.remoteAddr ?: "unknown"
    }

    private fun sendRateLimitResponse(response: HttpServletResponse, clientId: String) {
        response.status = HttpStatus.TOO_MANY_REQUESTS.value()
        response.contentType = MediaType.APPLICATION_JSON_VALUE
        response.setHeader("Retry-After", "60")

        val errorResponse = """
            {
                "error": "Too Many Requests",
                "message": "Rate limit exceeded. Please try again later.",
                "status": 429
            }
        """.trimIndent()

        response.writer.write(errorResponse)
        logger.warn("Rate limit exceeded for client: $clientId")
    }
}
