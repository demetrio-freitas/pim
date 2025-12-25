package com.pim.application

import com.fasterxml.jackson.databind.ObjectMapper
import com.opencsv.CSVReader
import com.pim.domain.dataimport.ImportJob
import com.pim.domain.dataimport.ImportStatus
import com.pim.domain.dataimport.ImportType
import com.pim.domain.product.Product
import com.pim.domain.product.ProductStatus
import com.pim.domain.product.ProductType
import com.pim.domain.user.User
import com.pim.infrastructure.persistence.CategoryRepository
import com.pim.infrastructure.persistence.ImportJobRepository
import com.pim.infrastructure.persistence.ProductRepository
import org.apache.poi.ss.usermodel.CellType
import org.apache.poi.ss.usermodel.Row
import org.apache.poi.ss.usermodel.WorkbookFactory
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
import java.io.InputStreamReader
import java.math.BigDecimal
import java.time.Instant
import java.util.*

data class ImportResult(
    val jobId: UUID,
    val status: ImportStatus,
    val totalRows: Int,
    val processedRows: Int,
    val successCount: Int,
    val errorCount: Int,
    val skipCount: Int,
    val errors: List<ImportError>
)

data class ImportError(
    val row: Int,
    val field: String?,
    val message: String
)

data class ImportPreview(
    val headers: List<String>,
    val sampleRows: List<Map<String, String>>,
    val totalRows: Int,
    val mappingSuggestions: Map<String, String>
)

@Service
class ImportService(
    private val importJobRepository: ImportJobRepository,
    private val productRepository: ProductRepository,
    private val categoryRepository: CategoryRepository,
    private val objectMapper: ObjectMapper
) {

    private val productFieldMappings = mapOf(
        "sku" to listOf("sku", "codigo", "code", "product_code", "codigo_produto"),
        "name" to listOf("name", "nome", "product_name", "nome_produto", "titulo", "title"),
        "description" to listOf("description", "descricao", "desc", "product_description"),
        "shortDescription" to listOf("short_description", "descricao_curta", "resumo", "summary"),
        "price" to listOf("price", "preco", "valor", "value", "sale_price"),
        "costPrice" to listOf("cost_price", "preco_custo", "custo", "cost"),
        "brand" to listOf("brand", "marca", "fabricante"),
        "manufacturer" to listOf("manufacturer", "fabricante", "fornecedor", "supplier"),
        "weight" to listOf("weight", "peso", "weight_kg"),
        "status" to listOf("status", "situacao", "state"),
        "type" to listOf("type", "tipo", "product_type"),
        "metaTitle" to listOf("meta_title", "seo_title", "titulo_seo"),
        "metaDescription" to listOf("meta_description", "seo_description", "descricao_seo"),
        "metaKeywords" to listOf("meta_keywords", "keywords", "palavras_chave"),
        "urlKey" to listOf("url_key", "slug", "url", "permalink"),
        "stockQuantity" to listOf("stock", "estoque", "quantity", "quantidade", "stock_quantity"),
        "categories" to listOf("categories", "categorias", "category", "categoria")
    )

    fun previewFile(file: MultipartFile): ImportPreview {
        val fileName = file.originalFilename ?: "unknown"

        return when {
            fileName.endsWith(".csv", ignoreCase = true) -> previewCsv(file)
            fileName.endsWith(".xlsx", ignoreCase = true) || fileName.endsWith(".xls", ignoreCase = true) -> previewExcel(file)
            else -> throw IllegalArgumentException("Formato não suportado. Use CSV ou Excel (.xlsx, .xls)")
        }
    }

    private fun previewCsv(file: MultipartFile): ImportPreview {
        val reader = CSVReader(InputStreamReader(file.inputStream))
        val allRows = reader.readAll()
        reader.close()

        if (allRows.isEmpty()) {
            throw IllegalArgumentException("Arquivo vazio")
        }

        val headers = allRows[0].toList()
        val dataRows = allRows.drop(1)

        val sampleRows = dataRows.take(5).map { row ->
            headers.zip(row).toMap()
        }

        val mappings = suggestMappings(headers)

        return ImportPreview(
            headers = headers,
            sampleRows = sampleRows,
            totalRows = dataRows.size,
            mappingSuggestions = mappings
        )
    }

    private fun previewExcel(file: MultipartFile): ImportPreview {
        val workbook = WorkbookFactory.create(file.inputStream)
        val sheet = workbook.getSheetAt(0)

        val headerRow = sheet.getRow(0) ?: throw IllegalArgumentException("Arquivo vazio")
        val headers = (0 until headerRow.lastCellNum).map {
            getCellStringValue(headerRow.getCell(it))
        }

        val sampleRows = mutableListOf<Map<String, String>>()
        var totalRows = 0

        for (i in 1..sheet.lastRowNum) {
            val row = sheet.getRow(i) ?: continue
            totalRows++

            if (sampleRows.size < 5) {
                val rowData = headers.mapIndexed { index, header ->
                    header to getCellStringValue(row.getCell(index))
                }.toMap()
                sampleRows.add(rowData)
            }
        }

        workbook.close()

        val mappings = suggestMappings(headers)

        return ImportPreview(
            headers = headers,
            sampleRows = sampleRows,
            totalRows = totalRows,
            mappingSuggestions = mappings
        )
    }

    private fun suggestMappings(headers: List<String>): Map<String, String> {
        val suggestions = mutableMapOf<String, String>()

        headers.forEach { header ->
            val normalizedHeader = header.lowercase().trim().replace(" ", "_")

            productFieldMappings.forEach { (field, aliases) ->
                if (aliases.any { it.equals(normalizedHeader, ignoreCase = true) }) {
                    suggestions[header] = field
                }
            }
        }

        return suggestions
    }

    @Transactional
    fun createImportJob(
        file: MultipartFile,
        type: ImportType,
        user: User?
    ): ImportJob {
        val fileName = "${UUID.randomUUID()}_${file.originalFilename}"

        val job = ImportJob(
            fileName = fileName,
            originalName = file.originalFilename ?: "unknown",
            type = type,
            userId = user?.id,
            userName = user?.fullName
        )

        return importJobRepository.save(job)
    }

    @Async
    @Transactional
    fun processImport(
        jobId: UUID,
        file: MultipartFile,
        fieldMappings: Map<String, String>,
        options: ImportOptions
    ) {
        val job = importJobRepository.findById(jobId).orElseThrow()
        job.status = ImportStatus.PROCESSING
        job.startedAt = Instant.now()
        importJobRepository.save(job)

        val errors = mutableListOf<ImportError>()
        var successCount = 0
        var errorCount = 0
        var skipCount = 0
        var processedRows = 0

        try {
            val fileName = file.originalFilename ?: ""
            val rows = when {
                fileName.endsWith(".csv", ignoreCase = true) -> parseCsv(file)
                else -> parseExcel(file)
            }

            job.totalRows = rows.size
            importJobRepository.save(job)

            rows.forEachIndexed { index, row ->
                processedRows++

                try {
                    val result = importProductRow(row, fieldMappings, options, index + 2)
                    when (result) {
                        is ImportRowResult.Success -> successCount++
                        is ImportRowResult.Skipped -> {
                            skipCount++
                            if (result.reason != null) {
                                errors.add(ImportError(index + 2, null, "Pulado: ${result.reason}"))
                            }
                        }
                        is ImportRowResult.Error -> {
                            errorCount++
                            errors.add(ImportError(index + 2, result.field, result.message))
                        }
                    }
                } catch (e: Exception) {
                    errorCount++
                    errors.add(ImportError(index + 2, null, e.message ?: "Erro desconhecido"))
                }

                // Update progress every 100 rows
                if (processedRows % 100 == 0) {
                    job.processedRows = processedRows
                    job.successCount = successCount
                    job.errorCount = errorCount
                    job.skipCount = skipCount
                    importJobRepository.save(job)
                }
            }

            job.status = ImportStatus.COMPLETED
        } catch (e: Exception) {
            job.status = ImportStatus.FAILED
            errors.add(ImportError(0, null, "Erro fatal: ${e.message}"))
        }

        job.processedRows = processedRows
        job.successCount = successCount
        job.errorCount = errorCount
        job.skipCount = skipCount
        job.errors = objectMapper.writeValueAsString(errors.take(1000)) // Limita a 1000 erros
        job.completedAt = Instant.now()
        importJobRepository.save(job)
    }

    private fun parseCsv(file: MultipartFile): List<Map<String, String>> {
        val reader = CSVReader(InputStreamReader(file.inputStream))
        val allRows = reader.readAll()
        reader.close()

        if (allRows.isEmpty()) return emptyList()

        val headers = allRows[0].toList()
        return allRows.drop(1).map { row ->
            headers.zip(row).toMap()
        }
    }

    private fun parseExcel(file: MultipartFile): List<Map<String, String>> {
        val workbook = WorkbookFactory.create(file.inputStream)
        val sheet = workbook.getSheetAt(0)

        val headerRow = sheet.getRow(0) ?: return emptyList()
        val headers = (0 until headerRow.lastCellNum).map {
            getCellStringValue(headerRow.getCell(it))
        }

        val rows = mutableListOf<Map<String, String>>()

        for (i in 1..sheet.lastRowNum) {
            val row = sheet.getRow(i) ?: continue
            val rowData = headers.mapIndexed { index, header ->
                header to getCellStringValue(row.getCell(index))
            }.toMap()
            rows.add(rowData)
        }

        workbook.close()
        return rows
    }

    private fun getCellStringValue(cell: org.apache.poi.ss.usermodel.Cell?): String {
        if (cell == null) return ""

        return when (cell.cellType) {
            CellType.STRING -> cell.stringCellValue
            CellType.NUMERIC -> {
                if (org.apache.poi.ss.usermodel.DateUtil.isCellDateFormatted(cell)) {
                    cell.localDateTimeCellValue.toString()
                } else {
                    val num = cell.numericCellValue
                    if (num == num.toLong().toDouble()) {
                        num.toLong().toString()
                    } else {
                        num.toString()
                    }
                }
            }
            CellType.BOOLEAN -> cell.booleanCellValue.toString()
            CellType.FORMULA -> cell.stringCellValue
            else -> ""
        }
    }

    private fun importProductRow(
        row: Map<String, String>,
        mappings: Map<String, String>,
        options: ImportOptions,
        rowNumber: Int
    ): ImportRowResult {
        // Inverte o mapping: campo do arquivo -> campo do produto
        val reverseMappings = mappings.entries.associate { (k, v) -> v to k }

        fun getValue(field: String): String? {
            val sourceField = reverseMappings[field] ?: return null
            return row[sourceField]?.trim()?.takeIf { it.isNotBlank() }
        }

        val sku = getValue("sku")
        if (sku.isNullOrBlank()) {
            return ImportRowResult.Error("sku", "SKU é obrigatório")
        }

        val existingProduct = productRepository.findBySku(sku)

        if (existingProduct != null) {
            return when (options.duplicateStrategy) {
                DuplicateStrategy.SKIP -> ImportRowResult.Skipped("SKU já existe: $sku")
                DuplicateStrategy.UPDATE -> updateProduct(existingProduct, row, mappings, options)
                DuplicateStrategy.ERROR -> ImportRowResult.Error("sku", "SKU já existe: $sku")
            }
        }

        // Create new product
        val name = getValue("name")
        if (name.isNullOrBlank()) {
            return ImportRowResult.Error("name", "Nome é obrigatório")
        }

        val product = Product(
            sku = sku,
            name = name,
            description = getValue("description"),
            shortDescription = getValue("shortDescription"),
            price = getValue("price")?.toBigDecimalOrNull(),
            costPrice = getValue("costPrice")?.toBigDecimalOrNull(),
            brand = getValue("brand"),
            manufacturer = getValue("manufacturer"),
            weight = getValue("weight")?.toBigDecimalOrNull() ?: BigDecimal.ZERO,
            status = parseStatus(getValue("status")),
            type = parseType(getValue("type")),
            metaTitle = getValue("metaTitle"),
            metaDescription = getValue("metaDescription"),
            metaKeywords = getValue("metaKeywords"),
            urlKey = getValue("urlKey") ?: generateUrlKey(name),
            stockQuantity = getValue("stockQuantity")?.toIntOrNull() ?: 0,
            isInStock = (getValue("stockQuantity")?.toIntOrNull() ?: 0) > 0
        )

        // Handle categories
        val categoriesValue = getValue("categories")
        if (!categoriesValue.isNullOrBlank()) {
            val categoryNames = categoriesValue.split(",", ";").map { it.trim() }
            categoryNames.forEach { categoryName ->
                val category = categoryRepository.findByCode(categoryName)
                    ?: categoryRepository.findByName(categoryName)
                if (category != null) {
                    product.categories.add(category)
                }
            }
        }

        product.completenessScore = product.calculateCompleteness()
        productRepository.save(product)

        return ImportRowResult.Success
    }

    private fun updateProduct(
        product: Product,
        row: Map<String, String>,
        mappings: Map<String, String>,
        options: ImportOptions
    ): ImportRowResult {
        val reverseMappings = mappings.entries.associate { (k, v) -> v to k }

        fun getValue(field: String): String? {
            val sourceField = reverseMappings[field] ?: return null
            return row[sourceField]?.trim()?.takeIf { it.isNotBlank() }
        }

        getValue("name")?.let { product.name = it }
        getValue("description")?.let { product.description = it }
        getValue("shortDescription")?.let { product.shortDescription = it }
        getValue("price")?.toBigDecimalOrNull()?.let { product.price = it }
        getValue("costPrice")?.toBigDecimalOrNull()?.let { product.costPrice = it }
        getValue("brand")?.let { product.brand = it }
        getValue("manufacturer")?.let { product.manufacturer = it }
        getValue("weight")?.toBigDecimalOrNull()?.let { product.weight = it }
        getValue("status")?.let { product.status = parseStatus(it) }
        getValue("metaTitle")?.let { product.metaTitle = it }
        getValue("metaDescription")?.let { product.metaDescription = it }
        getValue("metaKeywords")?.let { product.metaKeywords = it }
        getValue("urlKey")?.let { product.urlKey = it }
        getValue("stockQuantity")?.toIntOrNull()?.let {
            product.stockQuantity = it
            product.isInStock = it > 0
        }

        product.completenessScore = product.calculateCompleteness()
        product.updatedAt = Instant.now()
        productRepository.save(product)

        return ImportRowResult.Success
    }

    private fun parseStatus(value: String?): ProductStatus {
        if (value.isNullOrBlank()) return ProductStatus.DRAFT

        return when (value.lowercase()) {
            "published", "publicado", "ativo", "active" -> ProductStatus.PUBLISHED
            "draft", "rascunho" -> ProductStatus.DRAFT
            "pending", "pendente", "pending_review" -> ProductStatus.PENDING_REVIEW
            "approved", "aprovado" -> ProductStatus.APPROVED
            "archived", "arquivado", "inactive", "inativo" -> ProductStatus.ARCHIVED
            else -> ProductStatus.DRAFT
        }
    }

    private fun parseType(value: String?): ProductType {
        if (value.isNullOrBlank()) return ProductType.SIMPLE

        return when (value.lowercase()) {
            "simple", "simples" -> ProductType.SIMPLE
            "configurable", "configuravel" -> ProductType.CONFIGURABLE
            "virtual" -> ProductType.VIRTUAL
            "bundle", "kit" -> ProductType.BUNDLE
            "grouped", "agrupado" -> ProductType.GROUPED
            else -> ProductType.SIMPLE
        }
    }

    private fun generateUrlKey(name: String): String {
        return name.lowercase()
            .replace(Regex("[áàâã]"), "a")
            .replace(Regex("[éèê]"), "e")
            .replace(Regex("[íìî]"), "i")
            .replace(Regex("[óòôõ]"), "o")
            .replace(Regex("[úùû]"), "u")
            .replace("ç", "c")
            .replace(Regex("[^a-z0-9]+"), "-")
            .trim('-')
    }

    fun getJob(jobId: UUID): ImportJob? {
        return importJobRepository.findById(jobId).orElse(null)
    }

    fun getJobs(pageable: Pageable): Page<ImportJob> {
        return importJobRepository.findAllByOrderByCreatedAtDesc(pageable)
    }

    fun getUserJobs(userId: UUID, pageable: Pageable): Page<ImportJob> {
        return importJobRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
    }

    fun cancelJob(jobId: UUID): ImportJob {
        val job = importJobRepository.findById(jobId).orElseThrow()
        if (job.status == ImportStatus.PENDING || job.status == ImportStatus.PROCESSING) {
            job.status = ImportStatus.CANCELLED
            job.completedAt = Instant.now()
            return importJobRepository.save(job)
        }
        return job
    }
}

sealed class ImportRowResult {
    object Success : ImportRowResult()
    data class Skipped(val reason: String?) : ImportRowResult()
    data class Error(val field: String?, val message: String) : ImportRowResult()
}

data class ImportOptions(
    val duplicateStrategy: DuplicateStrategy = DuplicateStrategy.SKIP,
    val skipEmptyRows: Boolean = true,
    val trimValues: Boolean = true
)

enum class DuplicateStrategy {
    SKIP,    // Pular produtos com SKU existente
    UPDATE,  // Atualizar produtos existentes
    ERROR    // Reportar erro para SKUs duplicados
}
