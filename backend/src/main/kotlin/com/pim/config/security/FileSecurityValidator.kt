package com.pim.config.security

import org.springframework.stereotype.Component
import org.springframework.web.multipart.MultipartFile
import java.io.InputStream

/**
 * Security validator for file uploads.
 * Validates file type, content (magic bytes), and size to prevent malicious uploads.
 */
@Component
class FileSecurityValidator {

    companion object {
        // Allowed MIME types whitelist
        private val ALLOWED_IMAGE_TYPES = setOf(
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
            "image/svg+xml",
            "image/bmp",
            "image/tiff"
        )

        private val ALLOWED_VIDEO_TYPES = setOf(
            "video/mp4",
            "video/mpeg",
            "video/quicktime",
            "video/x-msvideo",
            "video/webm"
        )

        private val ALLOWED_AUDIO_TYPES = setOf(
            "audio/mpeg",
            "audio/mp3",
            "audio/wav",
            "audio/ogg",
            "audio/webm"
        )

        private val ALLOWED_DOCUMENT_TYPES = setOf(
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/plain",
            "text/csv"
        )

        private val ALL_ALLOWED_TYPES = ALLOWED_IMAGE_TYPES + ALLOWED_VIDEO_TYPES +
                                         ALLOWED_AUDIO_TYPES + ALLOWED_DOCUMENT_TYPES

        // Magic bytes for file type validation
        private val MAGIC_BYTES = mapOf(
            // Images
            "image/jpeg" to listOf(byteArrayOf(0xFF.toByte(), 0xD8.toByte(), 0xFF.toByte())),
            "image/png" to listOf(byteArrayOf(0x89.toByte(), 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)),
            "image/gif" to listOf(
                byteArrayOf(0x47, 0x49, 0x46, 0x38, 0x37, 0x61), // GIF87a
                byteArrayOf(0x47, 0x49, 0x46, 0x38, 0x39, 0x61)  // GIF89a
            ),
            "image/webp" to listOf(byteArrayOf(0x52, 0x49, 0x46, 0x46)), // RIFF
            "image/bmp" to listOf(byteArrayOf(0x42, 0x4D)), // BM

            // Videos
            "video/mp4" to listOf(
                byteArrayOf(0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70), // ftyp
                byteArrayOf(0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70),
                byteArrayOf(0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70)
            ),

            // Documents
            "application/pdf" to listOf(byteArrayOf(0x25, 0x50, 0x44, 0x46)), // %PDF

            // Audio
            "audio/mpeg" to listOf(
                byteArrayOf(0xFF.toByte(), 0xFB.toByte()), // MP3
                byteArrayOf(0xFF.toByte(), 0xFA.toByte()),
                byteArrayOf(0x49, 0x44, 0x33) // ID3
            )
        )

        // Dangerous file extensions that should NEVER be allowed
        private val DANGEROUS_EXTENSIONS = setOf(
            "exe", "bat", "cmd", "sh", "bash", "ps1", "vbs", "js", "jse",
            "wsf", "wsh", "msc", "jar", "class", "php", "phtml", "php3",
            "php4", "php5", "asp", "aspx", "jsp", "jspx", "cgi", "pl",
            "py", "rb", "htaccess", "htpasswd", "dll", "so", "dylib"
        )

        // Max file size: 50MB
        private const val MAX_FILE_SIZE = 50L * 1024 * 1024

        // Max filename length
        private const val MAX_FILENAME_LENGTH = 255
    }

    /**
     * Validates a file upload for security issues.
     * @throws SecurityException if the file is not safe
     */
    fun validateFile(file: MultipartFile) {
        validateFileSize(file)
        validateFilename(file.originalFilename ?: "unknown")
        validateMimeType(file.contentType)
        validateFileContent(file)
    }

    /**
     * Validates file size
     */
    private fun validateFileSize(file: MultipartFile) {
        if (file.size > MAX_FILE_SIZE) {
            throw SecurityException("File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB")
        }
        if (file.isEmpty) {
            throw SecurityException("Empty files are not allowed")
        }
    }

    /**
     * Validates and sanitizes filename
     */
    fun validateFilename(filename: String): String {
        if (filename.length > MAX_FILENAME_LENGTH) {
            throw SecurityException("Filename too long")
        }

        // Check for path traversal attempts
        if (filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
            throw SecurityException("Invalid filename: path traversal attempt detected")
        }

        // Check for dangerous extensions
        val extension = filename.substringAfterLast('.', "").lowercase()
        if (extension in DANGEROUS_EXTENSIONS) {
            throw SecurityException("File type not allowed: .$extension")
        }

        // Check for null bytes (used to bypass extension checks)
        if (filename.contains("\u0000")) {
            throw SecurityException("Invalid filename: null byte detected")
        }

        // Sanitize filename - remove any non-alphanumeric characters except . - _
        return filename.replace(Regex("[^a-zA-Z0-9._-]"), "_")
    }

    /**
     * Validates MIME type against whitelist
     */
    private fun validateMimeType(contentType: String?) {
        if (contentType == null) {
            throw SecurityException("Content type is required")
        }

        val normalizedType = contentType.lowercase().split(";").first().trim()

        if (normalizedType !in ALL_ALLOWED_TYPES) {
            throw SecurityException("File type not allowed: $contentType")
        }
    }

    /**
     * Validates file content matches declared MIME type using magic bytes
     */
    private fun validateFileContent(file: MultipartFile) {
        val contentType = file.contentType?.lowercase()?.split(";")?.first()?.trim() ?: return

        // Read first bytes to check magic number
        val headerBytes = ByteArray(12)
        file.inputStream.use { stream ->
            stream.read(headerBytes)
        }

        // Check magic bytes for known types
        val expectedMagicBytes = MAGIC_BYTES[contentType]
        if (expectedMagicBytes != null) {
            val matches = expectedMagicBytes.any { expected ->
                headerBytes.take(expected.size).toByteArray().contentEquals(expected)
            }
            if (!matches) {
                throw SecurityException("File content does not match declared type: $contentType")
            }
        }

        // Additional check: look for executable content in supposed non-executable files
        if (!contentType.startsWith("application/") || contentType == "application/pdf") {
            detectMaliciousContent(file.inputStream)
        }
    }

    /**
     * Detects potentially malicious content in files
     */
    private fun detectMaliciousContent(inputStream: InputStream) {
        val content = inputStream.bufferedReader().use { it.readText() }

        // Check for common script/executable patterns
        val dangerousPatterns = listOf(
            "<?php",
            "<%@",
            "<script",
            "javascript:",
            "vbscript:",
            "powershell",
            "cmd.exe",
            "/bin/sh",
            "/bin/bash",
            "eval(",
            "exec(",
            "system(",
            "passthru(",
            "shell_exec("
        )

        for (pattern in dangerousPatterns) {
            if (content.contains(pattern, ignoreCase = true)) {
                throw SecurityException("Potentially malicious content detected in file")
            }
        }
    }

    /**
     * Sanitizes a path to prevent path traversal
     */
    fun sanitizePath(path: String): String {
        // Normalize path separators
        var sanitized = path.replace("\\", "/")

        // Remove any path traversal attempts
        sanitized = sanitized.replace(Regex("\\.{2,}"), "")
        sanitized = sanitized.replace(Regex("/+"), "/")

        // Remove leading slashes
        sanitized = sanitized.trimStart('/')

        // Remove null bytes
        sanitized = sanitized.replace("\u0000", "")

        return sanitized
    }

    /**
     * Validates that a path is within the allowed base directory
     */
    fun validatePathWithinBase(path: java.nio.file.Path, basePath: java.nio.file.Path): Boolean {
        val normalizedPath = path.normalize().toAbsolutePath()
        val normalizedBase = basePath.normalize().toAbsolutePath()
        return normalizedPath.startsWith(normalizedBase)
    }
}

class SecurityException(message: String) : RuntimeException(message)
