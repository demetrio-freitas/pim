package com.pim.config

import com.pim.infrastructure.persistence.UserRepository
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
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

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val authHeader = request.getHeader("Authorization")

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response)
            return
        }

        val jwt = authHeader.substring(7)

        if (!jwtService.isTokenValid(jwt)) {
            filterChain.doFilter(request, response)
            return
        }

        val userId = jwtService.extractUserId(jwt)

        if (userId != null && SecurityContextHolder.getContext().authentication == null) {
            val user = userRepository.findByIdWithRolesAndPermissions(userId)

            if (user != null && user.isActive) {
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
            }
        }

        filterChain.doFilter(request, response)
    }
}
