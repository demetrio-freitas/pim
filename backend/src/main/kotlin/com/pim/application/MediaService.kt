package com.pim.application

import com.pim.config.security.FileSecurityValidator
import com.pim.config.security.SecurityException
import com.pim.config.security.UrlSecurityValidator
import com.pim.domain.media.Media
import com.pim.domain.product.MediaType
import com.pim.domain.product.Product
import com.pim.domain.product.ProductMedia
import com.pim.infrastructure.persistence.MediaLibraryRepository
import com.pim.infrastructure.persistence.ProductMediaRepository
import com.pim.infrastructure.persistence.ProductRepository
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
import java.io.ByteArrayInputStream
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.nio.file.StandardCopyOption
import java.time.Duration
import java.util.*
import javax.imageio.ImageIO

@Service
@Transactional
class MediaService(
    private val mediaLibraryRepository: MediaLibraryRepository,
    private val productMediaRepository: ProductMediaRepository,
    private val productRepository: ProductRepository,
    private val fileSecurityValidator: FileSecurityValidator,
    private val urlSecurityValidator: UrlSecurityValidator,
    @Value("\${media.upload.path:uploads}") private val uploadPath: String,
    @Value("\${media.base.url:http://localhost:8080/uploads}") private val baseUrl: String
) {
    private val logger = LoggerFactory.getLogger(MediaService::class.java)
    private val basePath: Path = Paths.get(uploadPath).toAbsolutePath().normalize()

    init {
        // Criar diretório de uploads se não existir
        if (!Files.exists(basePath)) {
            Files.createDirectories(basePath)
        }
    }

    // ==================== Media Library ====================

    fun findAll(pageable: Pageable): Page<Media> {
        return mediaLibraryRepository.findAll(pageable)
    }

    fun findById(id: UUID): Media? {
        return mediaLibraryRepository.findById(id).orElse(null)
    }

    fun findByType(type: MediaType, pageable: Pageable): Page<Media> {
        return mediaLibraryRepository.findByType(type, pageable)
    }

    fun findByFolder(folder: String?, pageable: Pageable): Page<Media> {
        return if (folder == null) {
            mediaLibraryRepository.findRootMedia(pageable)
        } else {
            mediaLibraryRepository.findByFolder(folder, pageable)
        }
    }

    fun search(query: String, pageable: Pageable): Page<Media> {
        return mediaLibraryRepository.search(query, pageable)
    }

    fun getAllFolders(): List<String> {
        return mediaLibraryRepository.findAllFolders()
    }

    fun upload(file: MultipartFile, folder: String? = null, userId: UUID? = null): Media {
        // SECURITY: Validate file before processing
        try {
            fileSecurityValidator.validateFile(file)
        } catch (e: SecurityException) {
            logger.warn("File upload rejected: ${e.message}")
            throw IllegalArgumentException("File validation failed: ${e.message}")
        }

        val originalName = file.originalFilename ?: "unknown"
        val sanitizedName = fileSecurityValidator.validateFilename(originalName)
        val extension = sanitizedName.substringAfterLast('.', "").lowercase()
        val fileName = "${UUID.randomUUID()}.$extension"
        val mimeType = file.contentType ?: "application/octet-stream"
        val type = getMediaType(mimeType)

        // Criar subdiretório por tipo
        val typeFolder = when (type) {
            MediaType.IMAGE -> "images"
            MediaType.VIDEO -> "videos"
            MediaType.DOCUMENT -> "documents"
            MediaType.AUDIO -> "audio"
        }

        // SECURITY: Validate path is within base directory
        val targetDir = basePath.resolve(typeFolder).normalize()
        if (!targetDir.startsWith(basePath)) {
            throw IllegalArgumentException("Invalid target directory")
        }

        if (!Files.exists(targetDir)) {
            Files.createDirectories(targetDir)
        }

        val targetPath = targetDir.resolve(fileName).normalize()
        // SECURITY: Double-check path traversal prevention
        if (!targetPath.startsWith(basePath)) {
            throw IllegalArgumentException("Invalid file path: path traversal detected")
        }

        Files.copy(file.inputStream, targetPath, StandardCopyOption.REPLACE_EXISTING)

        // Obter dimensões se for imagem
        var width: Int? = null
        var height: Int? = null
        if (type == MediaType.IMAGE) {
            try {
                val image = ImageIO.read(targetPath.toFile())
                width = image?.width
                height = image?.height
            } catch (e: Exception) {
                // Ignorar erro ao ler dimensões
            }
        }

        val media = Media(
            fileName = fileName,
            originalName = originalName,
            mimeType = mimeType,
            size = file.size,
            path = "$typeFolder/$fileName",
            url = "$baseUrl/$typeFolder/$fileName",
            type = type,
            folder = folder,
            width = width,
            height = height,
            createdBy = userId
        )

        return mediaLibraryRepository.save(media)
    }

    fun uploadMultiple(files: List<MultipartFile>, folder: String? = null, userId: UUID? = null): List<Media> {
        return files.map { upload(it, folder, userId) }
    }

    fun update(id: UUID, updateFn: (Media) -> Unit): Media {
        val media = mediaLibraryRepository.findById(id)
            .orElseThrow { NoSuchElementException("Media not found with id: $id") }
        updateFn(media)
        return mediaLibraryRepository.save(media)
    }

    fun delete(id: UUID) {
        val media = mediaLibraryRepository.findById(id)
            .orElseThrow { NoSuchElementException("Media not found with id: $id") }

        // Deletar arquivo físico
        try {
            val filePath = Paths.get(uploadPath, media.path)
            Files.deleteIfExists(filePath)
        } catch (e: Exception) {
            // Log error but continue
        }

        mediaLibraryRepository.delete(media)
    }

    fun createFolder(name: String): String {
        val folderPath = Paths.get(uploadPath, "folders", name)
        if (!Files.exists(folderPath)) {
            Files.createDirectories(folderPath)
        }
        return name
    }

    fun getStorageStats(): MediaStorageStats {
        val totalUsed = mediaLibraryRepository.getTotalStorageUsed() ?: 0
        val imageCount = mediaLibraryRepository.countByType(MediaType.IMAGE)
        val videoCount = mediaLibraryRepository.countByType(MediaType.VIDEO)
        val documentCount = mediaLibraryRepository.countByType(MediaType.DOCUMENT)

        return MediaStorageStats(
            totalFiles = mediaLibraryRepository.count(),
            totalSize = totalUsed,
            imageCount = imageCount,
            videoCount = videoCount,
            documentCount = documentCount
        )
    }

    // ==================== Product Media ====================

    fun getProductMedia(productId: UUID): List<ProductMedia> {
        return productMediaRepository.findByProductIdOrderByPosition(productId)
    }

    fun addMediaToProduct(productId: UUID, file: MultipartFile): ProductMedia {
        // SECURITY: Validate file before processing
        try {
            fileSecurityValidator.validateFile(file)
        } catch (e: SecurityException) {
            logger.warn("Product media upload rejected for product $productId: ${e.message}")
            throw IllegalArgumentException("File validation failed: ${e.message}")
        }

        val product = productRepository.findById(productId)
            .orElseThrow { NoSuchElementException("Product not found with id: $productId") }

        val originalName = file.originalFilename ?: "unknown"
        val sanitizedName = fileSecurityValidator.validateFilename(originalName)
        val extension = sanitizedName.substringAfterLast('.', "").lowercase()
        val fileName = "${UUID.randomUUID()}.$extension"
        val mimeType = file.contentType ?: "application/octet-stream"
        val type = getMediaType(mimeType)

        // SECURITY: Validate path is within base directory
        val targetDir = basePath.resolve("products").resolve(productId.toString()).normalize()
        if (!targetDir.startsWith(basePath)) {
            throw IllegalArgumentException("Invalid target directory")
        }

        if (!Files.exists(targetDir)) {
            Files.createDirectories(targetDir)
        }

        val targetPath = targetDir.resolve(fileName).normalize()
        // SECURITY: Double-check path traversal prevention
        if (!targetPath.startsWith(basePath)) {
            throw IllegalArgumentException("Invalid file path: path traversal detected")
        }

        Files.copy(file.inputStream, targetPath, StandardCopyOption.REPLACE_EXISTING)

        val currentCount = productMediaRepository.countByProductId(productId)
        val isFirst = currentCount == 0L

        val productMedia = ProductMedia(
            product = product,
            type = type,
            fileName = fileName,
            originalName = originalName,
            mimeType = mimeType,
            size = file.size,
            path = "products/$productId/$fileName",
            url = "$baseUrl/products/$productId/$fileName",
            position = currentCount.toInt(),
            isMain = isFirst
        )

        return productMediaRepository.save(productMedia)
    }

    fun addMultipleMediaToProduct(productId: UUID, files: List<MultipartFile>): List<ProductMedia> {
        return files.map { addMediaToProduct(productId, it) }
    }

    /**
     * Add media to product from external URL.
     * Downloads the file and saves it locally.
     * SECURITY: Validates URL to prevent SSRF attacks.
     */
    fun addMediaToProductFromUrl(productId: UUID, url: String): ProductMedia {
        // SECURITY: Validate URL to prevent SSRF
        try {
            urlSecurityValidator.validateImageUrl(url)
        } catch (e: SecurityException) {
            logger.warn("URL download rejected for product $productId: ${e.message} - URL: $url")
            throw IllegalArgumentException("URL validation failed: ${e.message}")
        }

        val product = productRepository.findById(productId)
            .orElseThrow { NoSuchElementException("Product not found with id: $productId") }

        // SECURITY: Download file from URL with timeout and size limits
        val client = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NORMAL) // Validate redirects
            .connectTimeout(Duration.ofSeconds(10))
            .build()

        val request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .header("User-Agent", "PIM-System/1.0")
            .timeout(Duration.ofSeconds(30))
            .GET()
            .build()

        val response = client.send(request, HttpResponse.BodyHandlers.ofByteArray())

        // SECURITY: Handle redirects - validate redirect URL
        if (response.statusCode() in 300..399) {
            val redirectUrl = response.headers().firstValue("Location").orElse(null)
            if (redirectUrl != null) {
                urlSecurityValidator.validateRedirect(url, redirectUrl)
            }
        }

        if (response.statusCode() != 200) {
            throw RuntimeException("Failed to download image from URL: ${response.statusCode()}")
        }

        val bytes = response.body()

        // SECURITY: Check file size (max 10MB for URL downloads)
        val maxSize = 10 * 1024 * 1024 // 10MB
        if (bytes.size > maxSize) {
            throw IllegalArgumentException("Downloaded file exceeds maximum size of 10MB")
        }

        val contentType = response.headers().firstValue("Content-Type").orElse("image/jpeg")

        // SECURITY: Validate content type
        if (!contentType.startsWith("image/")) {
            throw IllegalArgumentException("URL does not point to an image: $contentType")
        }

        // Determine extension from URL or content type
        val extension = when {
            url.contains(".webp") -> "webp"
            url.contains(".png") -> "png"
            url.contains(".gif") -> "gif"
            url.contains(".jpg") || url.contains(".jpeg") -> "jpg"
            contentType.contains("webp") -> "webp"
            contentType.contains("png") -> "png"
            contentType.contains("gif") -> "gif"
            else -> "jpg"
        }

        val fileName = "${UUID.randomUUID()}.$extension"
        val originalName = url.substringAfterLast('/').take(100)
            .replace(Regex("[^a-zA-Z0-9._-]"), "_") // Sanitize
        val mimeType = when (extension) {
            "webp" -> "image/webp"
            "png" -> "image/png"
            "gif" -> "image/gif"
            else -> "image/jpeg"
        }
        val type = MediaType.IMAGE

        // SECURITY: Validate path is within base directory
        val targetDir = basePath.resolve("products").resolve(productId.toString()).normalize()
        if (!targetDir.startsWith(basePath)) {
            throw IllegalArgumentException("Invalid target directory")
        }

        if (!Files.exists(targetDir)) {
            Files.createDirectories(targetDir)
        }

        val targetPath = targetDir.resolve(fileName).normalize()
        if (!targetPath.startsWith(basePath)) {
            throw IllegalArgumentException("Invalid file path: path traversal detected")
        }

        Files.copy(ByteArrayInputStream(bytes), targetPath, StandardCopyOption.REPLACE_EXISTING)

        // Get dimensions
        var width: Int? = null
        var height: Int? = null
        try {
            val image = ImageIO.read(targetPath.toFile())
            width = image?.width
            height = image?.height
        } catch (e: Exception) {
            // Ignore
        }

        val currentCount = productMediaRepository.countByProductId(productId)
        val isFirst = currentCount == 0L

        val productMedia = ProductMedia(
            product = product,
            type = type,
            fileName = fileName,
            originalName = originalName,
            mimeType = mimeType,
            size = bytes.size.toLong(),
            path = "products/$productId/$fileName",
            url = "$baseUrl/products/$productId/$fileName",
            position = currentCount.toInt(),
            isMain = isFirst,
            externalUrl = url  // Save original URL
        )

        return productMediaRepository.save(productMedia)
    }

    /**
     * Add external URL as media reference (without downloading).
     * The image will be served from the external URL.
     * SECURITY: Validates URL format and scheme.
     */
    fun addExternalUrlToProduct(productId: UUID, url: String, alt: String? = null): ProductMedia {
        // SECURITY: Validate URL to prevent javascript:/data: URLs
        try {
            urlSecurityValidator.validateImageUrl(url)
        } catch (e: SecurityException) {
            logger.warn("External URL rejected for product $productId: ${e.message} - URL: $url")
            throw IllegalArgumentException("URL validation failed: ${e.message}")
        }

        val product = productRepository.findById(productId)
            .orElseThrow { NoSuchElementException("Product not found with id: $productId") }

        val fileName = url.substringAfterLast('/').take(100)
            .replace(Regex("[^a-zA-Z0-9._-]"), "_") // Sanitize
        val extension = url.substringAfterLast('.', "jpg").take(4).lowercase()
        val mimeType = when (extension) {
            "webp" -> "image/webp"
            "png" -> "image/png"
            "gif" -> "image/gif"
            else -> "image/jpeg"
        }

        val currentCount = productMediaRepository.countByProductId(productId)
        val isFirst = currentCount == 0L

        val productMedia = ProductMedia(
            product = product,
            type = MediaType.IMAGE,
            fileName = fileName,
            originalName = fileName,
            mimeType = mimeType,
            size = 0,
            path = "",
            url = url,  // Use external URL directly
            position = currentCount.toInt(),
            isMain = isFirst,
            externalUrl = url,
            alt = alt
        )

        return productMediaRepository.save(productMedia)
    }

    fun setMainImage(productId: UUID, mediaId: UUID): ProductMedia {
        // Remover flag isMain de todas as imagens do produto
        val allMedia = productMediaRepository.findByProductIdOrderByPosition(productId)
        allMedia.forEach {
            if (it.isMain) {
                it.isMain = false
                productMediaRepository.save(it)
            }
        }

        // Definir nova imagem principal
        val media = productMediaRepository.findById(mediaId)
            .orElseThrow { NoSuchElementException("Media not found with id: $mediaId") }

        media.isMain = true
        return productMediaRepository.save(media)
    }

    fun updateProductMedia(mediaId: UUID, alt: String?, title: String?): ProductMedia {
        val media = productMediaRepository.findById(mediaId)
            .orElseThrow { NoSuchElementException("Media not found with id: $mediaId") }

        alt?.let { media.alt = it }
        title?.let { media.title = it }

        return productMediaRepository.save(media)
    }

    fun reorderProductMedia(productId: UUID, orderedIds: List<UUID>) {
        orderedIds.forEachIndexed { index, id ->
            productMediaRepository.findById(id).ifPresent { media ->
                media.position = index
                productMediaRepository.save(media)
            }
        }
    }

    fun deleteProductMedia(mediaId: UUID) {
        val media = productMediaRepository.findById(mediaId)
            .orElseThrow { NoSuchElementException("Media not found with id: $mediaId") }

        // Deletar arquivo físico
        try {
            val filePath = Paths.get(uploadPath, media.path)
            Files.deleteIfExists(filePath)
        } catch (e: Exception) {
            // Log error but continue
        }

        productMediaRepository.delete(media)
    }

    // ==================== Helper Methods ====================

    private fun getMediaType(mimeType: String): MediaType {
        return when {
            mimeType.startsWith("image/") -> MediaType.IMAGE
            mimeType.startsWith("video/") -> MediaType.VIDEO
            mimeType.startsWith("audio/") -> MediaType.AUDIO
            else -> MediaType.DOCUMENT
        }
    }
}

data class MediaStorageStats(
    val totalFiles: Long,
    val totalSize: Long,
    val imageCount: Long,
    val videoCount: Long,
    val documentCount: Long
) {
    val totalSizeMB: Double
        get() = totalSize / (1024.0 * 1024.0)

    val totalSizeGB: Double
        get() = totalSize / (1024.0 * 1024.0 * 1024.0)
}
