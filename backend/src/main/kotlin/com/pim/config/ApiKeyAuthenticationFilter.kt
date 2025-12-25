package com.pim.config

import com.pim.application.ApiKeyService
import com.pim.domain.integration.ApiKey
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.authentication.AbstractAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

class ApiKeyAuthentication(
    val apiKey: ApiKey
) : AbstractAuthenticationToken(
    apiKey.permissions.map { SimpleGrantedAuthority(it) }
) {
    init {
        isAuthenticated = true
    }

    override fun getCredentials(): Any = apiKey.keyPrefix
    override fun getPrincipal(): Any = apiKey
}

@Component
class ApiKeyAuthenticationFilter(
    private val apiKeyService: ApiKeyService
) : OncePerRequestFilter() {

    companion object {
        const val API_KEY_HEADER = "X-API-Key"
        const val API_KEY_QUERY_PARAM = "api_key"
    }

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        // Só aplica para endpoints /api/v1/*
        if (!request.requestURI.startsWith("/api/v1")) {
            filterChain.doFilter(request, response)
            return
        }

        // Ignora health check
        if (request.requestURI == "/api/v1/health") {
            filterChain.doFilter(request, response)
            return
        }

        val apiKey = extractApiKey(request)

        if (apiKey != null) {
            val clientIp = getClientIp(request)
            val requiredPermission = getRequiredPermission(request)

            val validatedKey = apiKeyService.validateKey(apiKey, requiredPermission, clientIp)

            if (validatedKey != null) {
                val authentication = ApiKeyAuthentication(validatedKey)
                SecurityContextHolder.getContext().authentication = authentication
                filterChain.doFilter(request, response)
                return
            }
        }

        // API Key inválida ou ausente
        response.status = HttpServletResponse.SC_UNAUTHORIZED
        response.contentType = "application/json"
        response.writer.write("""
            {
                "error": "Unauthorized",
                "message": "Invalid or missing API key",
                "hint": "Provide a valid API key in the X-API-Key header"
            }
        """.trimIndent())
    }

    private fun extractApiKey(request: HttpServletRequest): String? {
        // Primeiro tenta header
        val headerKey = request.getHeader(API_KEY_HEADER)
        if (!headerKey.isNullOrBlank()) return headerKey

        // Depois tenta query param
        val queryKey = request.getParameter(API_KEY_QUERY_PARAM)
        if (!queryKey.isNullOrBlank()) return queryKey

        // Por fim, tenta Authorization Bearer
        val authHeader = request.getHeader("Authorization")
        if (authHeader?.startsWith("Bearer pim_") == true) {
            return authHeader.removePrefix("Bearer ")
        }

        return null
    }

    private fun getClientIp(request: HttpServletRequest): String {
        val xForwardedFor = request.getHeader("X-Forwarded-For")
        return if (!xForwardedFor.isNullOrBlank()) {
            xForwardedFor.split(",").first().trim()
        } else {
            request.remoteAddr
        }
    }

    private fun getRequiredPermission(request: HttpServletRequest): String? {
        val method = request.method
        val path = request.requestURI

        return when {
            path.contains("/products") -> when (method) {
                "GET" -> "products.read"
                "POST" -> "products.write"
                "PUT", "PATCH" -> "products.write"
                "DELETE" -> "products.delete"
                else -> null
            }
            path.contains("/categories") -> when (method) {
                "GET" -> "categories.read"
                "POST" -> "categories.write"
                "PUT", "PATCH" -> "categories.write"
                "DELETE" -> "categories.delete"
                else -> null
            }
            path.contains("/attributes") -> when (method) {
                "GET" -> "attributes.read"
                "POST" -> "attributes.write"
                "PUT", "PATCH" -> "attributes.write"
                "DELETE" -> "attributes.delete"
                else -> null
            }
            path.contains("/media") -> when (method) {
                "GET" -> "media.read"
                "POST" -> "media.write"
                "DELETE" -> "media.delete"
                else -> null
            }
            path.contains("/export") -> "export"
            path.contains("/import") -> "import"
            else -> null
        }
    }
}
