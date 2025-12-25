package com.pim.config

import com.pim.infrastructure.persistence.UserRepository
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

@Component
class JwtAuthenticationFilter(
    private val jwtService: JwtService,
    private val userRepository: UserRepository
) : OncePerRequestFilter() {

    private val logger = LoggerFactory.getLogger(JwtAuthenticationFilter::class.java)

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val authHeader = request.getHeader("Authorization")
        val clientIp = getClientIp(request)
        val requestPath = request.requestURI

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response)
            return
        }

        val jwt = authHeader.substring(7)

        if (!jwtService.isTokenValid(jwt)) {
            // Log authentication failure for security monitoring
            logger.warn("Invalid JWT token attempted from IP: $clientIp for path: $requestPath")
            filterChain.doFilter(request, response)
            return
        }

        val userId = jwtService.extractUserId(jwt)

        if (userId != null && SecurityContextHolder.getContext().authentication == null) {
            val user = userRepository.findByIdWithRolesAndPermissions(userId)

            if (user == null) {
                // Log when token is valid but user doesn't exist (possibly deleted)
                logger.warn("Valid JWT for non-existent user $userId from IP: $clientIp")
                filterChain.doFilter(request, response)
                return
            }

            if (!user.isActive) {
                // Log when inactive user tries to access with valid token
                logger.warn("Inactive user $userId (${user.email}) attempted access from IP: $clientIp")
                filterChain.doFilter(request, response)
                return
            }

            val authorities = mutableListOf<SimpleGrantedAuthority>()

            // Add roles
            user.roles.forEach { role ->
                authorities.add(SimpleGrantedAuthority("ROLE_${role.name}"))
            }

            // Add permissions
            user.roles.flatMap { it.permissions }.forEach { permission ->
                authorities.add(SimpleGrantedAuthority(permission.name))
            }

            val authToken = UsernamePasswordAuthenticationToken(
                user,
                null,
                authorities
            )

            authToken.details = WebAuthenticationDetailsSource().buildDetails(request)
            SecurityContextHolder.getContext().authentication = authToken

            logger.debug("Authenticated user ${user.email} from IP: $clientIp")
        }

        filterChain.doFilter(request, response)
    }

    private fun getClientIp(request: HttpServletRequest): String {
        val xForwardedFor = request.getHeader("X-Forwarded-For")
        return if (!xForwardedFor.isNullOrBlank()) {
            // Take the first IP in the chain (original client)
            xForwardedFor.split(",").first().trim()
        } else {
            request.remoteAddr ?: "unknown"
        }
    }
}
