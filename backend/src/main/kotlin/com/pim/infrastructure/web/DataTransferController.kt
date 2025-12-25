package com.pim.infrastructure.web

import com.pim.application.*
import com.pim.domain.dataimport.ImportJob
import com.pim.domain.dataimport.ImportType
import com.pim.domain.product.ProductStatus
import com.pim.domain.user.User
import com.pim.infrastructure.persistence.UserRepository
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PageableDefault
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile
import java.time.Instant
import java.time.format.DateTimeFormatter
import java.util.*

// DTOs
data class ImportRequest(
    val fieldMappings: Map<String, String>,
    val duplicateStrategy: DuplicateStrategy = DuplicateStrategy.SKIP,
    val skipEmptyRows: Boolean = true
)

data class ExportRequest(
    val format: ExportFormat = ExportFormat.XLSX,
    val fields: List<String>? = null,
    val status: ProductStatus? = null,
    val categoryId: UUID? = null,
    val productIds: List<UUID>? = null
)

data class ImportJobResponse(
    val id: UUID,
    val fileName: String,
    val originalName: String,
    val type: String,
    val status: String,
    val totalRows: Int,
    val processedRows: Int,
    val successCount: Int,
    val errorCount: Int,
    val skipCount: Int,
    val progress: Int,
    val errors: List<ImportError>?,
    val userName: String?,
    val startedAt: Instant?,
    val completedAt: Instant?,
    val createdAt: Instant
)

@RestController
@RequestMapping("/api/data-transfer")
@Tag(name = "Data Transfer", description = "Import and Export endpoints")
class DataTransferController(
    private val importService: ImportService,
    private val exportService: ExportService,
    private val userRepository: UserRepository
) {

    private val dateFormatter = DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")
        .withZone(java.time.ZoneId.systemDefault())

    private fun getUser(userDetails: UserDetails): User? {
        return userRepository.findByEmail(userDetails.username)
    }

    // ==================== IMPORT ====================

    @PostMapping("/import/preview", consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    @Operation(summary = "Preview import file")
    @PreAuthorize("hasAuthority('products.create')")
    fun previewImport(
        @RequestParam("file") file: MultipartFile
    ): ResponseEntity<ImportPreview> {
        val preview = importService.previewFile(file)
        return ResponseEntity.ok(preview)
    }

    @PostMapping("/import/products", consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    @Operation(summary = "Import products from CSV/Excel")
    @PreAuthorize("hasAuthority('products.create')")
    fun importProducts(
        @RequestParam("file") file: MultipartFile,
        @RequestParam("mappings") mappingsJson: String,
        @RequestParam("duplicateStrategy", defaultValue = "SKIP") duplicateStrategy: DuplicateStrategy,
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<ImportJobResponse> {
        val user = getUser(userDetails)

        // Parse mappings from JSON
        val objectMapper = com.fasterxml.jackson.databind.ObjectMapper()
        val mappings: Map<String, String> = objectMapper.readValue(
            mappingsJson,
            object : com.fasterxml.jackson.core.type.TypeReference<Map<String, String>>() {}
        )

        // Create job
        val job = importService.createImportJob(file, ImportType.PRODUCTS, user)

        // Start async processing
        val options = ImportOptions(
            duplicateStrategy = duplicateStrategy,
            skipEmptyRows = true,
            trimValues = true
        )
        importService.processImport(job.id, file, mappings, options)

        return ResponseEntity.ok(job.toResponse())
    }

    @GetMapping("/import/jobs")
    @Operation(summary = "List import jobs")
    @PreAuthorize("hasAuthority('products.view')")
    fun listImportJobs(
        @PageableDefault(size = 20) pageable: Pageable,
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<Page<ImportJobResponse>> {
        val user = getUser(userDetails)
        val jobs = if (user != null) {
            importService.getUserJobs(user.id, pageable)
        } else {
            importService.getJobs(pageable)
        }

        return ResponseEntity.ok(jobs.map { it.toResponse() })
    }

    @GetMapping("/import/jobs/{jobId}")
    @Operation(summary = "Get import job status")
    @PreAuthorize("hasAuthority('products.view')")
    fun getImportJob(
        @PathVariable jobId: UUID
    ): ResponseEntity<ImportJobResponse> {
        val job = importService.getJob(jobId)
            ?: return ResponseEntity.notFound().build()

        return ResponseEntity.ok(job.toResponse())
    }

    @PostMapping("/import/jobs/{jobId}/cancel")
    @Operation(summary = "Cancel import job")
    @PreAuthorize("hasAuthority('products.create')")
    fun cancelImportJob(
        @PathVariable jobId: UUID
    ): ResponseEntity<ImportJobResponse> {
        val job = importService.cancelJob(jobId)
        return ResponseEntity.ok(job.toResponse())
    }

    @GetMapping("/import/template")
    @Operation(summary = "Download import template")
    @PreAuthorize("hasAuthority('products.view')")
    fun downloadTemplate(): ResponseEntity<ByteArray> {
        val template = exportService.generateTemplate()

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=template_importacao.xlsx")
            .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .body(template)
    }

    // ==================== EXPORT ====================

    @PostMapping("/export/products")
    @Operation(summary = "Export products to CSV/Excel")
    @PreAuthorize("hasAuthority('products.view')")
    fun exportProducts(
        @RequestBody request: ExportRequest
    ): ResponseEntity<ByteArray> {
        val options = ExportOptions(
            format = request.format,
            fields = request.fields ?: ExportOptions.defaultFields,
            includeHeaders = true,
            status = request.status,
            categoryId = request.categoryId,
            productIds = request.productIds
        )

        val data = exportService.exportProducts(options)
        val timestamp = dateFormatter.format(Instant.now())

        val (filename, contentType) = when (request.format) {
            ExportFormat.CSV -> "produtos_$timestamp.csv" to "text/csv; charset=utf-8"
            ExportFormat.XLSX -> "produtos_$timestamp.xlsx" to "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=$filename")
            .contentType(MediaType.parseMediaType(contentType))
            .body(data)
    }

    @GetMapping("/export/fields")
    @Operation(summary = "Get available export fields")
    @PreAuthorize("hasAuthority('products.view')")
    fun getExportFields(): ResponseEntity<List<Map<String, String>>> {
        return ResponseEntity.ok(exportService.getExportableFields())
    }

    // ==================== HELPERS ====================

    private fun ImportJob.toResponse(): ImportJobResponse {
        val errors = this.errors?.let {
            try {
                val objectMapper = com.fasterxml.jackson.databind.ObjectMapper()
                objectMapper.readValue(it, object : com.fasterxml.jackson.core.type.TypeReference<List<ImportError>>() {})
            } catch (e: Exception) {
                null
            }
        }

        val progress = if (totalRows > 0) {
            ((processedRows.toDouble() / totalRows) * 100).toInt()
        } else 0

        return ImportJobResponse(
            id = id,
            fileName = fileName,
            originalName = originalName,
            type = type.name,
            status = status.name,
            totalRows = totalRows,
            processedRows = processedRows,
            successCount = successCount,
            errorCount = errorCount,
            skipCount = skipCount,
            progress = progress,
            errors = errors,
            userName = userName,
            startedAt = startedAt,
            completedAt = completedAt,
            createdAt = createdAt
        )
    }
}
