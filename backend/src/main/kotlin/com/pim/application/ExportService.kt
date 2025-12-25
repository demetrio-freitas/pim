package com.pim.application

import com.opencsv.CSVWriter
import com.pim.domain.product.Product
import com.pim.domain.product.ProductStatus
import com.pim.infrastructure.persistence.ProductRepository
import org.apache.poi.ss.usermodel.CellStyle
import org.apache.poi.ss.usermodel.FillPatternType
import org.apache.poi.ss.usermodel.IndexedColors
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import java.io.ByteArrayOutputStream
import java.io.OutputStreamWriter
import java.time.format.DateTimeFormatter
import java.util.*

data class ExportOptions(
    val format: ExportFormat = ExportFormat.XLSX,
    val fields: List<String> = defaultFields,
    val includeHeaders: Boolean = true,
    val status: ProductStatus? = null,
    val categoryId: UUID? = null,
    val productIds: List<UUID>? = null
) {
    companion object {
        val defaultFields = listOf(
            "sku", "name", "description", "shortDescription", "price", "costPrice",
            "brand", "manufacturer", "weight", "status", "type",
            "metaTitle", "metaDescription", "metaKeywords", "urlKey",
            "stockQuantity", "isInStock", "completenessScore", "categories",
            "createdAt", "updatedAt"
        )

        val fieldLabels = mapOf(
            "sku" to "SKU",
            "name" to "Nome",
            "description" to "Descrição",
            "shortDescription" to "Descrição Curta",
            "price" to "Preço",
            "costPrice" to "Preço de Custo",
            "brand" to "Marca",
            "manufacturer" to "Fabricante",
            "weight" to "Peso",
            "status" to "Status",
            "type" to "Tipo",
            "metaTitle" to "Meta Título",
            "metaDescription" to "Meta Descrição",
            "metaKeywords" to "Palavras-chave",
            "urlKey" to "URL Key",
            "stockQuantity" to "Estoque",
            "isInStock" to "Em Estoque",
            "completenessScore" to "Completude %",
            "categories" to "Categorias",
            "createdAt" to "Criado em",
            "updatedAt" to "Atualizado em"
        )
    }
}

enum class ExportFormat {
    CSV,
    XLSX
}

@Service
class ExportService(
    private val productRepository: ProductRepository
) {

    private val dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
        .withZone(java.time.ZoneId.systemDefault())

    fun exportProducts(options: ExportOptions): ByteArray {
        val products = fetchProducts(options)

        return when (options.format) {
            ExportFormat.CSV -> exportToCsv(products, options)
            ExportFormat.XLSX -> exportToExcel(products, options)
        }
    }

    private fun fetchProducts(options: ExportOptions): List<Product> {
        return when {
            options.productIds != null && options.productIds.isNotEmpty() -> {
                productRepository.findAllById(options.productIds)
            }
            options.status != null && options.categoryId != null -> {
                productRepository.findByStatusAndCategoriesId(
                    options.status,
                    options.categoryId,
                    PageRequest.of(0, 10000)
                ).content
            }
            options.status != null -> {
                productRepository.findByStatus(options.status, PageRequest.of(0, 10000)).content
            }
            options.categoryId != null -> {
                productRepository.findByCategoriesId(options.categoryId, PageRequest.of(0, 10000)).content
            }
            else -> {
                productRepository.findAll(PageRequest.of(0, 10000)).content
            }
        }
    }

    private fun exportToCsv(products: List<Product>, options: ExportOptions): ByteArray {
        val outputStream = ByteArrayOutputStream()
        val writer = CSVWriter(OutputStreamWriter(outputStream, Charsets.UTF_8))

        // BOM for Excel UTF-8 compatibility
        outputStream.write(byteArrayOf(0xEF.toByte(), 0xBB.toByte(), 0xBF.toByte()))

        // Headers
        if (options.includeHeaders) {
            val headers = options.fields.map { ExportOptions.fieldLabels[it] ?: it }.toTypedArray()
            writer.writeNext(headers)
        }

        // Data rows
        products.forEach { product ->
            val row = options.fields.map { field -> getFieldValue(product, field) }.toTypedArray()
            writer.writeNext(row)
        }

        writer.close()
        return outputStream.toByteArray()
    }

    private fun exportToExcel(products: List<Product>, options: ExportOptions): ByteArray {
        val workbook = XSSFWorkbook()
        val sheet = workbook.createSheet("Produtos")

        // Header style
        val headerStyle = workbook.createCellStyle().apply {
            fillForegroundColor = IndexedColors.GREY_25_PERCENT.index
            fillPattern = FillPatternType.SOLID_FOREGROUND
            val font = workbook.createFont()
            font.bold = true
            setFont(font)
        }

        var rowNum = 0

        // Headers
        if (options.includeHeaders) {
            val headerRow = sheet.createRow(rowNum++)
            options.fields.forEachIndexed { index, field ->
                val cell = headerRow.createCell(index)
                cell.setCellValue(ExportOptions.fieldLabels[field] ?: field)
                cell.cellStyle = headerStyle
            }
        }

        // Data rows
        products.forEach { product ->
            val row = sheet.createRow(rowNum++)
            options.fields.forEachIndexed { index, field ->
                val cell = row.createCell(index)
                val value = getFieldValue(product, field)

                // Try to set numeric values as numbers
                when (field) {
                    "price", "costPrice", "weight" -> {
                        value.toDoubleOrNull()?.let { cell.setCellValue(it) } ?: cell.setCellValue(value)
                    }
                    "stockQuantity", "completenessScore" -> {
                        value.toDoubleOrNull()?.let { cell.setCellValue(it) } ?: cell.setCellValue(value)
                    }
                    else -> cell.setCellValue(value)
                }
            }
        }

        // Auto-size columns
        options.fields.indices.forEach { sheet.autoSizeColumn(it) }

        val outputStream = ByteArrayOutputStream()
        workbook.write(outputStream)
        workbook.close()

        return outputStream.toByteArray()
    }

    private fun getFieldValue(product: Product, field: String): String {
        return when (field) {
            "sku" -> product.sku
            "name" -> product.name
            "description" -> product.description ?: ""
            "shortDescription" -> product.shortDescription ?: ""
            "price" -> product.price?.toString() ?: ""
            "costPrice" -> product.costPrice?.toString() ?: ""
            "brand" -> product.brand ?: ""
            "manufacturer" -> product.manufacturer ?: ""
            "weight" -> product.weight.toString()
            "status" -> translateStatus(product.status)
            "type" -> translateType(product.type)
            "metaTitle" -> product.metaTitle ?: ""
            "metaDescription" -> product.metaDescription ?: ""
            "metaKeywords" -> product.metaKeywords ?: ""
            "urlKey" -> product.urlKey ?: ""
            "stockQuantity" -> product.stockQuantity.toString()
            "isInStock" -> if (product.isInStock) "Sim" else "Não"
            "completenessScore" -> product.completenessScore.toString()
            "categories" -> product.categories.joinToString("; ") { it.name }
            "createdAt" -> dateFormatter.format(product.createdAt)
            "updatedAt" -> dateFormatter.format(product.updatedAt)
            else -> ""
        }
    }

    private fun translateStatus(status: com.pim.domain.product.ProductStatus): String {
        return when (status) {
            com.pim.domain.product.ProductStatus.DRAFT -> "Rascunho"
            com.pim.domain.product.ProductStatus.PENDING_REVIEW -> "Pendente"
            com.pim.domain.product.ProductStatus.APPROVED -> "Aprovado"
            com.pim.domain.product.ProductStatus.PUBLISHED -> "Publicado"
            com.pim.domain.product.ProductStatus.ARCHIVED -> "Arquivado"
        }
    }

    private fun translateType(type: com.pim.domain.product.ProductType): String {
        return when (type) {
            com.pim.domain.product.ProductType.SIMPLE -> "Simples"
            com.pim.domain.product.ProductType.CONFIGURABLE -> "Configurável"
            com.pim.domain.product.ProductType.VIRTUAL -> "Virtual"
            com.pim.domain.product.ProductType.BUNDLE -> "Kit"
            com.pim.domain.product.ProductType.GROUPED -> "Agrupado"
        }
    }

    fun getExportableFields(): List<Map<String, String>> {
        return ExportOptions.defaultFields.map { field ->
            mapOf(
                "value" to field,
                "label" to (ExportOptions.fieldLabels[field] ?: field)
            )
        }
    }

    fun generateTemplate(): ByteArray {
        val workbook = XSSFWorkbook()
        val sheet = workbook.createSheet("Template de Importação")

        // Header style
        val headerStyle = workbook.createCellStyle().apply {
            fillForegroundColor = IndexedColors.LIGHT_BLUE.index
            fillPattern = FillPatternType.SOLID_FOREGROUND
            val font = workbook.createFont()
            font.bold = true
            font.color = IndexedColors.WHITE.index
            setFont(font)
        }

        // Required fields style
        val requiredStyle = workbook.createCellStyle().apply {
            fillForegroundColor = IndexedColors.LIGHT_YELLOW.index
            fillPattern = FillPatternType.SOLID_FOREGROUND
        }

        val templateFields = listOf(
            "sku" to true,
            "name" to true,
            "description" to false,
            "shortDescription" to false,
            "price" to false,
            "costPrice" to false,
            "brand" to false,
            "manufacturer" to false,
            "weight" to false,
            "status" to false,
            "metaTitle" to false,
            "metaDescription" to false,
            "metaKeywords" to false,
            "urlKey" to false,
            "stockQuantity" to false,
            "categories" to false
        )

        // Header row
        val headerRow = sheet.createRow(0)
        templateFields.forEachIndexed { index, (field, _) ->
            val cell = headerRow.createCell(index)
            cell.setCellValue(ExportOptions.fieldLabels[field] ?: field)
            cell.cellStyle = headerStyle
        }

        // Example row
        val exampleRow = sheet.createRow(1)
        val exampleData = listOf(
            "PROD-001", "Produto Exemplo", "Descrição completa do produto",
            "Descrição curta", "99.90", "50.00", "Marca X", "Fabricante Y",
            "1.5", "draft", "Título SEO", "Descrição SEO", "palavra1, palavra2",
            "produto-exemplo", "100", "Eletrônicos; Acessórios"
        )
        exampleData.forEachIndexed { index, value ->
            val cell = exampleRow.createCell(index)
            cell.setCellValue(value)
            if (templateFields[index].second) {
                cell.cellStyle = requiredStyle
            }
        }

        // Instructions sheet
        val instructionsSheet = workbook.createSheet("Instruções")
        val instructions = listOf(
            "INSTRUÇÕES DE IMPORTAÇÃO",
            "",
            "Campos obrigatórios: SKU, Nome",
            "",
            "Status válidos: draft, published, pending, approved, archived",
            "",
            "Categorias: Separe múltiplas categorias com ponto e vírgula (;)",
            "",
            "Preços: Use ponto como separador decimal (ex: 99.90)",
            "",
            "Peso: Em quilogramas (kg)",
            "",
            "Campos em amarelo na planilha de exemplo são obrigatórios."
        )

        instructions.forEachIndexed { index, text ->
            val row = instructionsSheet.createRow(index)
            val cell = row.createCell(0)
            cell.setCellValue(text)
            if (index == 0) {
                val boldStyle = workbook.createCellStyle()
                val font = workbook.createFont()
                font.bold = true
                font.fontHeightInPoints = 14
                boldStyle.setFont(font)
                cell.cellStyle = boldStyle
            }
        }

        // Auto-size columns
        templateFields.indices.forEach { sheet.autoSizeColumn(it) }
        instructionsSheet.autoSizeColumn(0)

        val outputStream = ByteArrayOutputStream()
        workbook.write(outputStream)
        workbook.close()

        return outputStream.toByteArray()
    }
}
