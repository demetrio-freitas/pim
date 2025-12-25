package com.pim.config.security

import org.springframework.stereotype.Component
import java.net.InetAddress
import java.net.URI
import java.net.URL

/**
 * Security validator for URLs to prevent SSRF (Server-Side Request Forgery) attacks.
 * Blocks requests to internal networks, cloud metadata services, and localhost.
 */
@Component
class UrlSecurityValidator {

    companion object {
        // Allowed URL schemes
        private val ALLOWED_SCHEMES = setOf("http", "https")

        // Blocked hostnames
        private val BLOCKED_HOSTNAMES = setOf(
            "localhost",
            "127.0.0.1",
            "0.0.0.0",
            "::1",
            "[::1]",
            "metadata.google.internal",        // GCP metadata
            "metadata.google.com",
            "169.254.169.254",                 // AWS/Azure/GCP metadata
            "metadata.azure.com",
            "management.azure.com",
            "kubernetes.default",              // Kubernetes
            "kubernetes.default.svc",
            "kubernetes.default.svc.cluster.local"
        )

        // Blocked ports (internal services)
        private val BLOCKED_PORTS = setOf(
            22,     // SSH
            23,     // Telnet
            25,     // SMTP
            135,    // Windows RPC
            137,    // NetBIOS
            138,    // NetBIOS
            139,    // NetBIOS
            445,    // SMB
            1433,   // MSSQL
            1521,   // Oracle
            3306,   // MySQL
            5432,   // PostgreSQL
            5672,   // RabbitMQ
            6379,   // Redis
            9200,   // Elasticsearch
            9300,   // Elasticsearch
            27017   // MongoDB
        )

        // Private IP ranges (RFC 1918 + others)
        private val PRIVATE_IP_PATTERNS = listOf(
            Regex("^10\\..*"),                              // 10.0.0.0/8
            Regex("^172\\.(1[6-9]|2[0-9]|3[0-1])\\..*"),   // 172.16.0.0/12
            Regex("^192\\.168\\..*"),                       // 192.168.0.0/16
            Regex("^127\\..*"),                             // 127.0.0.0/8 (loopback)
            Regex("^0\\..*"),                               // 0.0.0.0/8
            Regex("^169\\.254\\..*"),                       // 169.254.0.0/16 (link-local)
            Regex("^224\\..*"),                             // 224.0.0.0/4 (multicast)
            Regex("^240\\..*"),                             // 240.0.0.0/4 (reserved)
            Regex("^fc.*", RegexOption.IGNORE_CASE),        // IPv6 unique local
            Regex("^fd.*", RegexOption.IGNORE_CASE),        // IPv6 unique local
            Regex("^fe80.*", RegexOption.IGNORE_CASE),      // IPv6 link-local
            Regex("^::1$"),                                 // IPv6 loopback
            Regex("^::$")                                   // IPv6 unspecified
        )

        // Allowed image extensions for URL downloads
        private val ALLOWED_IMAGE_EXTENSIONS = setOf(
            "jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"
        )

        // Max URL length
        private const val MAX_URL_LENGTH = 2048

        // Max number of redirects to follow
        const val MAX_REDIRECTS = 5
    }

    /**
     * Validates a URL for SSRF vulnerabilities.
     * @throws SecurityException if the URL is not safe
     */
    fun validateUrl(urlString: String) {
        // Check URL length
        if (urlString.length > MAX_URL_LENGTH) {
            throw SecurityException("URL too long")
        }

        // Check for data: URLs or javascript:
        val lowerUrl = urlString.lowercase()
        if (lowerUrl.startsWith("data:") || lowerUrl.startsWith("javascript:") ||
            lowerUrl.startsWith("vbscript:") || lowerUrl.startsWith("file:")) {
            throw SecurityException("URL scheme not allowed")
        }

        val url = try {
            URI.create(urlString).toURL()
        } catch (e: Exception) {
            throw SecurityException("Invalid URL format: ${e.message}")
        }

        validateScheme(url)
        validateHost(url)
        validatePort(url)
        validateIpAddress(url)
    }

    /**
     * Validates URL for image downloads specifically
     */
    fun validateImageUrl(urlString: String) {
        validateUrl(urlString)

        // Check extension
        val extension = urlString.substringAfterLast('.', "")
            .substringBefore('?')
            .lowercase()

        if (extension.isNotEmpty() && extension !in ALLOWED_IMAGE_EXTENSIONS) {
            throw SecurityException("URL does not point to an allowed image type")
        }
    }

    /**
     * Validates URL scheme
     */
    private fun validateScheme(url: URL) {
        val scheme = url.protocol.lowercase()
        if (scheme !in ALLOWED_SCHEMES) {
            throw SecurityException("URL scheme not allowed: $scheme")
        }
    }

    /**
     * Validates hostname
     */
    private fun validateHost(url: URL) {
        val host = url.host.lowercase()

        if (host.isEmpty()) {
            throw SecurityException("URL must have a hostname")
        }

        // Check blocked hostnames
        if (host in BLOCKED_HOSTNAMES) {
            throw SecurityException("Access to $host is not allowed")
        }

        // Check for IP address in hostname
        if (host.matches(Regex("^[0-9.]+$")) || host.startsWith("[")) {
            validateIpAddressString(host)
        }

        // Block internal domain patterns
        val blockedPatterns = listOf(
            ".local",
            ".internal",
            ".localhost",
            ".localdomain",
            ".corp",
            ".home",
            ".lan"
        )

        for (pattern in blockedPatterns) {
            if (host.endsWith(pattern)) {
                throw SecurityException("Access to internal domains is not allowed")
            }
        }
    }

    /**
     * Validates port
     */
    private fun validatePort(url: URL) {
        val port = if (url.port == -1) {
            if (url.protocol == "https") 443 else 80
        } else {
            url.port
        }

        if (port in BLOCKED_PORTS) {
            throw SecurityException("Access to port $port is not allowed")
        }
    }

    /**
     * Validates IP address from URL (performs DNS resolution)
     */
    private fun validateIpAddress(url: URL) {
        val host = url.host

        // Resolve hostname to IP
        val addresses = try {
            InetAddress.getAllByName(host)
        } catch (e: Exception) {
            throw SecurityException("Unable to resolve hostname: $host")
        }

        for (address in addresses) {
            val ip = address.hostAddress
            validateIpAddressString(ip)

            // Check if it's a loopback or site-local address
            if (address.isLoopbackAddress) {
                throw SecurityException("Loopback addresses are not allowed")
            }
            if (address.isSiteLocalAddress) {
                throw SecurityException("Site-local addresses are not allowed")
            }
            if (address.isLinkLocalAddress) {
                throw SecurityException("Link-local addresses are not allowed")
            }
            if (address.isAnyLocalAddress) {
                throw SecurityException("Any-local addresses are not allowed")
            }
        }
    }

    /**
     * Validates an IP address string
     */
    private fun validateIpAddressString(ip: String) {
        val cleanIp = ip.trim('[', ']')

        for (pattern in PRIVATE_IP_PATTERNS) {
            if (pattern.matches(cleanIp)) {
                throw SecurityException("Access to private/internal IP addresses is not allowed: $ip")
            }
        }
    }

    /**
     * Validates that a redirect URL is safe
     */
    fun validateRedirect(originalUrl: String, redirectUrl: String) {
        // Validate the redirect URL using the same rules
        validateUrl(redirectUrl)

        // Optionally: ensure redirect stays on same domain
        // val originalHost = URI.create(originalUrl).host
        // val redirectHost = URI.create(redirectUrl).host
        // if (originalHost != redirectHost) {
        //     throw SecurityException("Cross-domain redirects are not allowed")
        // }
    }
}
