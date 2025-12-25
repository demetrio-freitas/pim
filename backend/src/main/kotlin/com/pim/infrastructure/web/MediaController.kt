package com.pim.infrastructure.web

import com.pim.application.MediaService
import com.pim.application.MediaStorageStats
import com.pim.domain.media.Media
import com.pim.domain.product.MediaType
import com.pim.domain.product.ProductMedia
import com.pim.domain.user.User
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PageableDefault
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType as HttpMediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile
import java.util.*

@RestController
@RequestMapping("/api/media")
@Tag(name = "Media Library", description = "Digital Asset Management endpoints")
class MediaController(
    private val mediaService: MediaService
) {

    @GetMapping
    @Operation(summary = "List all media")
    @PreAuthorize("hasAuthority('media.view')")
    fun list(
        @PageableDefault(size = 24) pageable: Pageable,
        @RequestParam(required = false) type: MediaType?,
        @RequestParam(required = false) folder: String?,
        @RequestParam(required = false) search: String?
    ): ResponseEntity<Page<MediaResponse>> {
        val media = when {
            search != null -> mediaService.search(search, pageable)
            type != null -> mediaService.findByType(type, pageable)
            folder != null || folder == "" -> mediaService.findByFolder(folder.takeIf { it.isNotEmpty() }, pageable)
            else -> mediaService.findAll(pageable)
        }
        return ResponseEntity.ok(media.map { it.toResponse() })
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get media by ID")
    @PreAuthorize("hasAuthority('media.view')")
    fun getById(@PathVariable id: UUID): ResponseEntity<MediaDetailResponse> {
        val media = mediaService.findById(id)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(media.toDetailResponse())
    }

    @PostMapping(consumes = [HttpMediaType.MULTIPART_FORM_DATA_VALUE])
    @Operation(summary = "Upload media file")
    @PreAuthorize("hasAuthority('media.create')")
    fun upload(
        @RequestParam("file") file: MultipartFile,
        @RequestParam(required = false) folder: String?,
        @AuthenticationPrincipal user: User?
    ): ResponseEntity<MediaResponse> {
        val media = mediaService.upload(file, folder, user?.id)
        return ResponseEntity.status(HttpStatus.CREATED).body(media.toResponse())
    }

    @PostMapping("/batch", consumes = [HttpMediaType.MULTIPART_FORM_DATA_VALUE])
    @Operation(summary = "Upload multiple media files")
    @PreAuthorize("hasAuthority('media.create')")
    fun uploadMultiple(
        @RequestParam("files") files: List<MultipartFile>,
        @RequestParam(required = false) folder: String?,
        @AuthenticationPrincipal user: User?
    ): ResponseEntity<List<MediaResponse>> {
        val media = mediaService.uploadMultiple(files, folder, user?.id)
        return ResponseEntity.status(HttpStatus.CREATED).body(media.map { it.toResponse() })
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update media metadata")
    @PreAuthorize("hasAuthority('media.edit')")
    fun update(
        @PathVariable id: UUID,
        @RequestBody request: UpdateMediaRequest
    ): ResponseEntity<MediaResponse> {
        val updated = mediaService.update(id) { media ->
            request.alt?.let { media.alt = it }
            request.title?.let { media.title = it }
            request.description?.let { media.description = it }
            request.folder?.let { media.folder = it }
            request.tags?.let { media.tags = it.toMutableSet() }
        }
        return ResponseEntity.ok(updated.toResponse())
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete media")
    @PreAuthorize("hasAuthority('media.delete')")
    fun delete(@PathVariable id: UUID): ResponseEntity<Void> {
        mediaService.delete(id)
        return ResponseEntity.noContent().build()
    }

    @GetMapping("/folders")
    @Operation(summary = "List all folders")
    @PreAuthorize("hasAuthority('media.view')")
    fun getFolders(): ResponseEntity<List<String>> {
        return ResponseEntity.ok(mediaService.getAllFolders())
    }

    @PostMapping("/folders")
    @Operation(summary = "Create folder")
    @PreAuthorize("hasAuthority('media.create')")
    fun createFolder(@RequestBody request: CreateFolderRequest): ResponseEntity<Map<String, String>> {
        val folder = mediaService.createFolder(request.name)
        return ResponseEntity.status(HttpStatus.CREATED).body(mapOf("name" to folder))
    }

    @GetMapping("/stats")
    @Operation(summary = "Get storage statistics")
    @PreAuthorize("hasAuthority('media.view')")
    fun getStats(): ResponseEntity<MediaStorageStats> {
        return ResponseEntity.ok(mediaService.getStorageStats())
    }
}

@RestController
@RequestMapping("/api/products/{productId}/media")
@Tag(name = "Product Media", description = "Product media management endpoints")
class ProductMediaController(
    private val mediaService: MediaService
) {

    @GetMapping
    @Operation(summary = "List product media")
    @PreAuthorize("hasAuthority('products.view')")
    fun list(@PathVariable productId: UUID): ResponseEntity<List<ProductMediaResponse>> {
        val media = mediaService.getProductMedia(productId)
        return ResponseEntity.ok(media.map { it.toResponse() })
    }

    @PostMapping(consumes = [HttpMediaType.MULTIPART_FORM_DATA_VALUE])
    @Operation(summary = "Add media to product")
    @PreAuthorize("hasAuthority('products.edit')")
    fun addMedia(
        @PathVariable productId: UUID,
        @RequestParam("file") file: MultipartFile
    ): ResponseEntity<ProductMediaResponse> {
        val media = mediaService.addMediaToProduct(productId, file)
        return ResponseEntity.status(HttpStatus.CREATED).body(media.toResponse())
    }

    @PostMapping("/batch", consumes = [HttpMediaType.MULTIPART_FORM_DATA_VALUE])
    @Operation(summary = "Add multiple media to product")
    @PreAuthorize("hasAuthority('products.edit')")
    fun addMultipleMedia(
        @PathVariable productId: UUID,
        @RequestParam("files") files: List<MultipartFile>
    ): ResponseEntity<List<ProductMediaResponse>> {
        val media = mediaService.addMultipleMediaToProduct(productId, files)
        return ResponseEntity.status(HttpStatus.CREATED).body(media.map { it.toResponse() })
    }

    @PostMapping("/from-url")
    @Operation(summary = "Add media from URL (downloads the file)")
    @PreAuthorize("hasAuthority('products.edit')")
    fun addMediaFromUrl(
        @PathVariable productId: UUID,
        @RequestBody request: AddMediaFromUrlRequest
    ): ResponseEntity<ProductMediaResponse> {
        val media = mediaService.addMediaToProductFromUrl(productId, request.url)
        return ResponseEntity.status(HttpStatus.CREATED).body(media.toResponse())
    }

    @PostMapping("/external")
    @Operation(summary = "Add external URL as media reference")
    @PreAuthorize("hasAuthority('products.edit')")
    fun addExternalUrl(
        @PathVariable productId: UUID,
        @RequestBody request: AddExternalUrlRequest
    ): ResponseEntity<ProductMediaResponse> {
        val media = mediaService.addExternalUrlToProduct(productId, request.url, request.alt)
        return ResponseEntity.status(HttpStatus.CREATED).body(media.toResponse())
    }

    @PatchMapping("/{mediaId}/main")
    @Operation(summary = "Set main image")
    @PreAuthorize("hasAuthority('products.edit')")
    fun setMain(
        @PathVariable productId: UUID,
        @PathVariable mediaId: UUID
    ): ResponseEntity<ProductMediaResponse> {
        val media = mediaService.setMainImage(productId, mediaId)
        return ResponseEntity.ok(media.toResponse())
    }

    @PutMapping("/{mediaId}")
    @Operation(summary = "Update product media")
    @PreAuthorize("hasAuthority('products.edit')")
    fun update(
        @PathVariable productId: UUID,
        @PathVariable mediaId: UUID,
        @RequestBody request: UpdateProductMediaRequest
    ): ResponseEntity<ProductMediaResponse> {
        val media = mediaService.updateProductMedia(mediaId, request.alt, request.title)
        return ResponseEntity.ok(media.toResponse())
    }

    @PutMapping("/reorder")
    @Operation(summary = "Reorder product media")
    @PreAuthorize("hasAuthority('products.edit')")
    fun reorder(
        @PathVariable productId: UUID,
        @RequestBody request: ReorderMediaRequest
    ): ResponseEntity<Void> {
        mediaService.reorderProductMedia(productId, request.orderedIds)
        return ResponseEntity.ok().build()
    }

    @DeleteMapping("/{mediaId}")
    @Operation(summary = "Delete product media")
    @PreAuthorize("hasAuthority('products.edit')")
    fun delete(
        @PathVariable productId: UUID,
        @PathVariable mediaId: UUID
    ): ResponseEntity<Void> {
        mediaService.deleteProductMedia(mediaId)
        return ResponseEntity.noContent().build()
    }
}

// DTOs
data class UpdateMediaRequest(
    val alt: String? = null,
    val title: String? = null,
    val description: String? = null,
    val folder: String? = null,
    val tags: List<String>? = null
)

data class UpdateProductMediaRequest(
    val alt: String? = null,
    val title: String? = null
)

data class ReorderMediaRequest(
    val orderedIds: List<UUID>
)

data class CreateFolderRequest(
    val name: String
)

data class AddMediaFromUrlRequest(
    val url: String
)

data class AddExternalUrlRequest(
    val url: String,
    val alt: String? = null
)

data class MediaResponse(
    val id: UUID,
    val fileName: String,
    val originalName: String,
    val mimeType: String,
    val size: Long,
    val url: String?,
    val type: MediaType,
    val folder: String?,
    val width: Int?,
    val height: Int?,
    val createdAt: java.time.Instant
)

data class MediaDetailResponse(
    val id: UUID,
    val fileName: String,
    val originalName: String,
    val mimeType: String,
    val size: Long,
    val url: String?,
    val type: MediaType,
    val alt: String?,
    val title: String?,
    val description: String?,
    val folder: String?,
    val tags: Set<String>,
    val width: Int?,
    val height: Int?,
    val createdAt: java.time.Instant,
    val updatedAt: java.time.Instant
)

data class ProductMediaResponse(
    val id: UUID,
    val fileName: String,
    val originalName: String,
    val mimeType: String,
    val size: Long,
    val url: String?,
    val type: MediaType,
    val alt: String?,
    val title: String?,
    val position: Int,
    val isMain: Boolean,
    val externalUrl: String?
)

fun Media.toResponse() = MediaResponse(
    id = id,
    fileName = fileName,
    originalName = originalName,
    mimeType = mimeType,
    size = size,
    url = url,
    type = type,
    folder = folder,
    width = width,
    height = height,
    createdAt = createdAt
)

fun Media.toDetailResponse() = MediaDetailResponse(
    id = id,
    fileName = fileName,
    originalName = originalName,
    mimeType = mimeType,
    size = size,
    url = url,
    type = type,
    alt = alt,
    title = title,
    description = description,
    folder = folder,
    tags = tags,
    width = width,
    height = height,
    createdAt = createdAt,
    updatedAt = updatedAt
)

fun ProductMedia.toResponse() = ProductMediaResponse(
    id = id,
    fileName = fileName,
    originalName = originalName,
    mimeType = mimeType,
    size = size,
    url = url,
    type = type,
    alt = alt,
    title = title,
    position = position,
    isMain = isMain,
    externalUrl = externalUrl
)
