package com.pim.application

import com.pim.domain.product.Product
import com.pim.domain.product.ProductCondition
import org.springframework.stereotype.Service
import java.util.*

@Service
class ChannelValidationService {

    // ==================== Main Validation ====================

    fun validateForChannel(product: Product, channelCode: String): ChannelValidationResult {
        return when (channelCode.lowercase()) {
            "mercadolivre", "ml" -> validateForMercadoLivre(product)
            "amazon" -> validateForAmazon(product)
            "shopify" -> validateForShopify(product)
            "google_shopping", "google" -> validateForGoogleShopping(product)
            "woocommerce", "woo" -> validateForWooCommerce(product)
            "vtex" -> validateForVTEX(product)
            else -> ChannelValidationResult(
                channelCode = channelCode,
                isValid = true,
                errors = emptyList(),
                warnings = emptyList(),
                score = 100
            )
        }
    }

    fun validateForAllChannels(product: Product): Map<String, ChannelValidationResult> {
        val channels = listOf("mercadolivre", "amazon", "shopify", "google_shopping", "woocommerce", "vtex")
        return channels.associateWith { validateForChannel(product, it) }
    }

    // ==================== Mercado Livre Validation ====================

    private fun validateForMercadoLivre(product: Product): ChannelValidationResult {
        val errors = mutableListOf<ValidationIssue>()
        val warnings = mutableListOf<ValidationIssue>()

        // Required fields
        if (product.name.length < 5) {
            errors.add(ValidationIssue("name", "Título deve ter no mínimo 5 caracteres", "REQUIRED"))
        }
        if (product.name.length > 60) {
            warnings.add(ValidationIssue("name", "Título muito longo, será truncado (máx 60 caracteres)", "LENGTH"))
        }

        val price = product.price
        if (price == null || price <= java.math.BigDecimal.ZERO) {
            errors.add(ValidationIssue("price", "Preço é obrigatório e deve ser maior que zero", "REQUIRED"))
        }

        if (product.stockQuantity <= 0) {
            errors.add(ValidationIssue("stockQuantity", "Quantidade em estoque deve ser maior que zero", "REQUIRED"))
        }

        // Recommended fields
        if (product.description.isNullOrBlank()) {
            warnings.add(ValidationIssue("description", "Descrição é recomendada para melhor ranqueamento", "RECOMMENDED"))
        } else if (product.description!!.length < 50) {
            warnings.add(ValidationIssue("description", "Descrição muito curta, recomendado mínimo 50 caracteres", "QUALITY"))
        }

        if (product.brand.isNullOrBlank()) {
            warnings.add(ValidationIssue("brand", "Marca é recomendada para melhor visibilidade", "RECOMMENDED"))
        }

        // ML-specific fields
        if (product.mlCategoryId.isNullOrBlank()) {
            warnings.add(ValidationIssue("mlCategoryId", "Categoria do Mercado Livre não definida", "RECOMMENDED"))
        }

        if (product.warranty.isNullOrBlank()) {
            warnings.add(ValidationIssue("warranty", "Garantia é recomendada para produtos novos", "RECOMMENDED"))
        }

        // Shipping dimensions
        if (product.weight == null || product.weight <= java.math.BigDecimal.ZERO) {
            warnings.add(ValidationIssue("weight", "Peso é necessário para cálculo de frete", "SHIPPING"))
        }

        if (product.length == null || product.width == null || product.height == null) {
            warnings.add(ValidationIssue("dimensions", "Dimensões são necessárias para cálculo de frete", "SHIPPING"))
        }

        // Images validation would go here
        // if (product.mediaItems.isEmpty()) {
        //     errors.add(ValidationIssue("images", "Pelo menos 1 imagem é obrigatória", "REQUIRED"))
        // }

        val score = calculateScore(errors.size, warnings.size)

        return ChannelValidationResult(
            channelCode = "mercadolivre",
            channelName = "Mercado Livre",
            isValid = errors.isEmpty(),
            errors = errors,
            warnings = warnings,
            score = score,
            requiredFields = listOf("name", "price", "stockQuantity", "images"),
            recommendedFields = listOf("description", "brand", "mlCategoryId", "warranty", "weight", "dimensions", "gtin")
        )
    }

    // ==================== Amazon Validation ====================

    private fun validateForAmazon(product: Product): ChannelValidationResult {
        val errors = mutableListOf<ValidationIssue>()
        val warnings = mutableListOf<ValidationIssue>()

        // Required fields
        if (product.name.length < 10) {
            errors.add(ValidationIssue("name", "Título deve ter no mínimo 10 caracteres", "REQUIRED"))
        }
        if (product.name.length > 200) {
            errors.add(ValidationIssue("name", "Título excede o limite de 200 caracteres", "LENGTH"))
        }

        val amazonPrice = product.price
        if (amazonPrice == null || amazonPrice <= java.math.BigDecimal.ZERO) {
            errors.add(ValidationIssue("price", "Preço é obrigatório", "REQUIRED"))
        }

        if (product.brand.isNullOrBlank()) {
            errors.add(ValidationIssue("brand", "Marca é obrigatória para Amazon", "REQUIRED"))
        }

        // Product identifiers (at least one required for most categories)
        val hasIdentifier = !product.gtin.isNullOrBlank() ||
                !product.asin.isNullOrBlank() ||
                !product.mpn.isNullOrBlank()

        if (!hasIdentifier) {
            errors.add(ValidationIssue("productIdentifier", "GTIN, ASIN ou MPN é obrigatório", "REQUIRED"))
        }

        // Recommended fields
        if (product.description.isNullOrBlank()) {
            warnings.add(ValidationIssue("description", "Descrição é altamente recomendada", "RECOMMENDED"))
        } else if (product.description!!.length < 150) {
            warnings.add(ValidationIssue("description", "Descrição muito curta, recomendado mínimo 150 caracteres", "QUALITY"))
        }

        // Bullet points
        if (product.amazonBulletPoints.isNullOrBlank()) {
            warnings.add(ValidationIssue("amazonBulletPoints", "Bullet points são recomendados para melhor conversão", "RECOMMENDED"))
        }

        // Search terms
        if (product.amazonSearchTerms.isNullOrBlank()) {
            warnings.add(ValidationIssue("amazonSearchTerms", "Termos de busca melhoram a descoberta do produto", "RECOMMENDED"))
        }

        // Category
        if (product.amazonProductType.isNullOrBlank() && product.amazonBrowseNodeId.isNullOrBlank()) {
            warnings.add(ValidationIssue("amazonCategory", "Tipo de produto ou Browse Node ID não definido", "RECOMMENDED"))
        }

        // FBA requirements
        if (product.amazonFulfillmentChannel?.name == "FBA") {
            if (product.weight == null) {
                errors.add(ValidationIssue("weight", "Peso é obrigatório para FBA", "FBA_REQUIRED"))
            }
            if (product.length == null || product.width == null || product.height == null) {
                errors.add(ValidationIssue("dimensions", "Dimensões são obrigatórias para FBA", "FBA_REQUIRED"))
            }
            if (product.barcode.isNullOrBlank() && product.gtin.isNullOrBlank()) {
                errors.add(ValidationIssue("barcode", "Código de barras é obrigatório para FBA", "FBA_REQUIRED"))
            }
        }

        val score = calculateScore(errors.size, warnings.size)

        return ChannelValidationResult(
            channelCode = "amazon",
            channelName = "Amazon",
            isValid = errors.isEmpty(),
            errors = errors,
            warnings = warnings,
            score = score,
            requiredFields = listOf("name", "price", "brand", "productIdentifier", "images"),
            recommendedFields = listOf("description", "bulletPoints", "searchTerms", "category")
        )
    }

    // ==================== Shopify Validation ====================

    private fun validateForShopify(product: Product): ChannelValidationResult {
        val errors = mutableListOf<ValidationIssue>()
        val warnings = mutableListOf<ValidationIssue>()

        // Required fields
        if (product.name.isBlank()) {
            errors.add(ValidationIssue("name", "Título é obrigatório", "REQUIRED"))
        }
        if (product.name.length > 255) {
            errors.add(ValidationIssue("name", "Título excede o limite de 255 caracteres", "LENGTH"))
        }

        // Recommended
        if (product.description.isNullOrBlank()) {
            warnings.add(ValidationIssue("description", "Descrição é recomendada", "RECOMMENDED"))
        }

        if (product.vendor.isNullOrBlank() && product.brand.isNullOrBlank()) {
            warnings.add(ValidationIssue("vendor", "Fornecedor/Marca é recomendado", "RECOMMENDED"))
        }

        if (product.productType.isNullOrBlank()) {
            warnings.add(ValidationIssue("productType", "Tipo de produto é recomendado para organização", "RECOMMENDED"))
        }

        // SEO
        if (product.urlKey.isNullOrBlank()) {
            warnings.add(ValidationIssue("urlKey", "URL amigável não definida", "SEO"))
        }

        if (product.metaTitle.isNullOrBlank()) {
            warnings.add(ValidationIssue("metaTitle", "Meta título é recomendado para SEO", "SEO"))
        }

        if (product.metaDescription.isNullOrBlank()) {
            warnings.add(ValidationIssue("metaDescription", "Meta descrição é recomendada para SEO", "SEO"))
        }

        // Shipping
        if (product.requiresShipping && product.weight == null) {
            warnings.add(ValidationIssue("weight", "Peso é recomendado para produtos físicos", "SHIPPING"))
        }

        val score = calculateScore(errors.size, warnings.size)

        return ChannelValidationResult(
            channelCode = "shopify",
            channelName = "Shopify",
            isValid = errors.isEmpty(),
            errors = errors,
            warnings = warnings,
            score = score,
            requiredFields = listOf("name"),
            recommendedFields = listOf("description", "vendor", "productType", "urlKey", "metaTitle", "metaDescription")
        )
    }

    // ==================== Google Shopping Validation ====================

    private fun validateForGoogleShopping(product: Product): ChannelValidationResult {
        val errors = mutableListOf<ValidationIssue>()
        val warnings = mutableListOf<ValidationIssue>()

        // Required fields
        if (product.name.length < 3) {
            errors.add(ValidationIssue("name", "Título deve ter no mínimo 3 caracteres", "REQUIRED"))
        }
        if (product.name.length > 150) {
            errors.add(ValidationIssue("name", "Título excede o limite de 150 caracteres", "LENGTH"))
        }

        if (product.description.isNullOrBlank()) {
            errors.add(ValidationIssue("description", "Descrição é obrigatória para Google Shopping", "REQUIRED"))
        } else if (product.description!!.length > 5000) {
            errors.add(ValidationIssue("description", "Descrição excede o limite de 5000 caracteres", "LENGTH"))
        }

        if (product.price == null) {
            errors.add(ValidationIssue("price", "Preço é obrigatório", "REQUIRED"))
        }

        if (product.isInStock == null) {
            errors.add(ValidationIssue("availability", "Disponibilidade é obrigatória", "REQUIRED"))
        }

        if (product.brand.isNullOrBlank()) {
            errors.add(ValidationIssue("brand", "Marca é obrigatória para Google Shopping", "REQUIRED"))
        }

        // GTIN requirement for known brands
        if (product.gtin.isNullOrBlank() && product.mpn.isNullOrBlank()) {
            errors.add(ValidationIssue("gtin", "GTIN ou MPN é obrigatório", "REQUIRED"))
        }

        // Condition
        if (product.productCondition == null) {
            warnings.add(ValidationIssue("condition", "Condição do produto não definida, será assumido 'novo'", "RECOMMENDED"))
        }

        // Google Category
        if (product.googleCategory.isNullOrBlank() && product.googleCategoryId.isNullOrBlank()) {
            errors.add(ValidationIssue("googleCategory", "Categoria do Google é obrigatória", "REQUIRED"))
        }

        // Apparel specific
        if (isApparelCategory(product.googleCategoryId)) {
            if (product.gender == null) {
                errors.add(ValidationIssue("gender", "Gênero é obrigatório para vestuário", "APPAREL_REQUIRED"))
            }
            if (product.ageGroup == null) {
                errors.add(ValidationIssue("ageGroup", "Faixa etária é obrigatória para vestuário", "APPAREL_REQUIRED"))
            }
            if (product.color.isNullOrBlank()) {
                errors.add(ValidationIssue("color", "Cor é obrigatória para vestuário", "APPAREL_REQUIRED"))
            }
            if (product.size.isNullOrBlank()) {
                warnings.add(ValidationIssue("size", "Tamanho é recomendado para vestuário", "APPAREL_RECOMMENDED"))
            }
        }

        val score = calculateScore(errors.size, warnings.size)

        return ChannelValidationResult(
            channelCode = "google_shopping",
            channelName = "Google Shopping",
            isValid = errors.isEmpty(),
            errors = errors,
            warnings = warnings,
            score = score,
            requiredFields = listOf("name", "description", "price", "availability", "brand", "gtin", "googleCategory", "images"),
            recommendedFields = listOf("condition", "color", "size", "gender", "ageGroup", "mpn")
        )
    }

    // ==================== WooCommerce Validation ====================

    private fun validateForWooCommerce(product: Product): ChannelValidationResult {
        val errors = mutableListOf<ValidationIssue>()
        val warnings = mutableListOf<ValidationIssue>()

        // Required fields
        if (product.name.isBlank()) {
            errors.add(ValidationIssue("name", "Nome é obrigatório", "REQUIRED"))
        }

        if (product.sku.isBlank()) {
            errors.add(ValidationIssue("sku", "SKU é obrigatório", "REQUIRED"))
        }

        // Recommended
        if (product.description.isNullOrBlank()) {
            warnings.add(ValidationIssue("description", "Descrição é recomendada", "RECOMMENDED"))
        }

        if (product.shortDescription.isNullOrBlank()) {
            warnings.add(ValidationIssue("shortDescription", "Descrição curta é recomendada", "RECOMMENDED"))
        }

        // External products
        if (product.type.name == "EXTERNAL" && product.externalUrl.isNullOrBlank()) {
            errors.add(ValidationIssue("externalUrl", "URL externa é obrigatória para produtos externos", "REQUIRED"))
        }

        // Downloadable products
        if (product.type.name == "DOWNLOADABLE") {
            if (product.downloadLimit == null) {
                warnings.add(ValidationIssue("downloadLimit", "Limite de downloads não definido", "RECOMMENDED"))
            }
            if (product.downloadExpiry == null) {
                warnings.add(ValidationIssue("downloadExpiry", "Expiração de download não definida", "RECOMMENDED"))
            }
        }

        val score = calculateScore(errors.size, warnings.size)

        return ChannelValidationResult(
            channelCode = "woocommerce",
            channelName = "WooCommerce",
            isValid = errors.isEmpty(),
            errors = errors,
            warnings = warnings,
            score = score,
            requiredFields = listOf("name", "sku"),
            recommendedFields = listOf("description", "shortDescription", "categories")
        )
    }

    // ==================== VTEX Validation ====================

    private fun validateForVTEX(product: Product): ChannelValidationResult {
        val errors = mutableListOf<ValidationIssue>()
        val warnings = mutableListOf<ValidationIssue>()

        // Required fields
        if (product.name.isBlank()) {
            errors.add(ValidationIssue("name", "Nome é obrigatório", "REQUIRED"))
        }
        if (product.name.length > 150) {
            errors.add(ValidationIssue("name", "Nome excede o limite de 150 caracteres", "LENGTH"))
        }

        if (product.brand.isNullOrBlank()) {
            errors.add(ValidationIssue("brand", "Marca é obrigatória para VTEX", "REQUIRED"))
        }

        // Recommended
        if (product.description.isNullOrBlank()) {
            warnings.add(ValidationIssue("description", "Descrição é recomendada", "RECOMMENDED"))
        }

        if (product.metaTitle.isNullOrBlank()) {
            warnings.add(ValidationIssue("metaTitle", "Título para SEO não definido", "SEO"))
        }

        if (product.metaDescription.isNullOrBlank()) {
            warnings.add(ValidationIssue("metaDescription", "Descrição para SEO não definida", "SEO"))
        }

        val score = calculateScore(errors.size, warnings.size)

        return ChannelValidationResult(
            channelCode = "vtex",
            channelName = "VTEX",
            isValid = errors.isEmpty(),
            errors = errors,
            warnings = warnings,
            score = score,
            requiredFields = listOf("name", "brand", "categories"),
            recommendedFields = listOf("description", "metaTitle", "metaDescription")
        )
    }

    // ==================== Helper Functions ====================

    private fun calculateScore(errorCount: Int, warningCount: Int): Int {
        val baseScore = 100
        val errorPenalty = errorCount * 15
        val warningPenalty = warningCount * 5
        return maxOf(0, baseScore - errorPenalty - warningPenalty)
    }

    private fun isApparelCategory(categoryId: String?): Boolean {
        if (categoryId == null) return false
        // Google Shopping apparel category IDs start with specific ranges
        val apparelCategories = listOf("166", "1604", "2271", "5388", "5322")
        return apparelCategories.any { categoryId.startsWith(it) }
    }
}

// ==================== DTOs ====================

data class ValidationIssue(
    val field: String,
    val message: String,
    val type: String // REQUIRED, RECOMMENDED, LENGTH, QUALITY, SEO, SHIPPING, FBA_REQUIRED, APPAREL_REQUIRED
)

data class ChannelValidationResult(
    val channelCode: String,
    val channelName: String = channelCode,
    val isValid: Boolean,
    val errors: List<ValidationIssue>,
    val warnings: List<ValidationIssue>,
    val score: Int,
    val requiredFields: List<String> = emptyList(),
    val recommendedFields: List<String> = emptyList()
)
