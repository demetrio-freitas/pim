package com.pim.infrastructure.web

import com.pim.application.ChannelValidationResult
import com.pim.application.ChannelValidationService
import com.pim.infrastructure.persistence.ProductRepository
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*
import java.util.*

@RestController
@RequestMapping("/api/channel-validation")
@Tag(name = "Channel Validation", description = "Product validation for different sales channels")
class ChannelValidationController(
    private val validationService: ChannelValidationService,
    private val productRepository: ProductRepository
) {

    @GetMapping("/product/{productId}")
    @Operation(summary = "Validate product for all channels")
    @PreAuthorize("hasAuthority('products.view')")
    fun validateProductForAllChannels(
        @PathVariable productId: UUID
    ): ResponseEntity<Map<String, ChannelValidationResult>> {
        val product = productRepository.findById(productId)
            .orElseThrow { IllegalArgumentException("Produto não encontrado") }

        val results = validationService.validateForAllChannels(product)
        return ResponseEntity.ok(results)
    }

    @GetMapping("/product/{productId}/channel/{channelCode}")
    @Operation(summary = "Validate product for a specific channel")
    @PreAuthorize("hasAuthority('products.view')")
    fun validateProductForChannel(
        @PathVariable productId: UUID,
        @PathVariable channelCode: String
    ): ResponseEntity<ChannelValidationResult> {
        val product = productRepository.findById(productId)
            .orElseThrow { IllegalArgumentException("Produto não encontrado") }

        val result = validationService.validateForChannel(product, channelCode)
        return ResponseEntity.ok(result)
    }

    @GetMapping("/channels")
    @Operation(summary = "Get available channels for validation")
    @PreAuthorize("hasAuthority('products.view')")
    fun getAvailableChannels(): ResponseEntity<List<ChannelInfo>> {
        val channels = listOf(
            ChannelInfo(
                code = "mercadolivre",
                name = "Mercado Livre",
                description = "Marketplace líder na América Latina",
                icon = "package",
                color = "#FFE600"
            ),
            ChannelInfo(
                code = "amazon",
                name = "Amazon",
                description = "Maior e-commerce do mundo",
                icon = "shopping-cart",
                color = "#FF9900"
            ),
            ChannelInfo(
                code = "shopify",
                name = "Shopify",
                description = "Plataforma de e-commerce",
                icon = "shopping-bag",
                color = "#7AB55C"
            ),
            ChannelInfo(
                code = "google_shopping",
                name = "Google Shopping",
                description = "Feed de produtos para Google",
                icon = "search",
                color = "#4285F4"
            ),
            ChannelInfo(
                code = "woocommerce",
                name = "WooCommerce",
                description = "Plugin WordPress para e-commerce",
                icon = "box",
                color = "#7B5CF0"
            ),
            ChannelInfo(
                code = "vtex",
                name = "VTEX",
                description = "Plataforma de digital commerce",
                icon = "globe",
                color = "#F71963"
            )
        )
        return ResponseEntity.ok(channels)
    }

    @PostMapping("/bulk/channel/{channelCode}")
    @Operation(summary = "Validate multiple products for a channel")
    @PreAuthorize("hasAuthority('products.view')")
    fun validateProductsForChannel(
        @PathVariable channelCode: String,
        @RequestBody request: BulkValidationRequest
    ): ResponseEntity<BulkValidationResult> {
        val products = productRepository.findAllById(request.productIds)

        val results = products.map { product ->
            ProductValidationSummary(
                productId = product.id,
                productName = product.name,
                productSku = product.sku,
                validation = validationService.validateForChannel(product, channelCode)
            )
        }

        val validCount = results.count { it.validation.isValid }
        val invalidCount = results.size - validCount
        val averageScore = if (results.isNotEmpty()) {
            results.map { it.validation.score }.average().toInt()
        } else 0

        return ResponseEntity.ok(BulkValidationResult(
            channelCode = channelCode,
            totalProducts = results.size,
            validProducts = validCount,
            invalidProducts = invalidCount,
            averageScore = averageScore,
            results = results
        ))
    }
}

data class ChannelInfo(
    val code: String,
    val name: String,
    val description: String,
    val icon: String,
    val color: String
)

data class BulkValidationRequest(
    val productIds: List<UUID>
)

data class ProductValidationSummary(
    val productId: UUID,
    val productName: String,
    val productSku: String,
    val validation: ChannelValidationResult
)

data class BulkValidationResult(
    val channelCode: String,
    val totalProducts: Int,
    val validProducts: Int,
    val invalidProducts: Int,
    val averageScore: Int,
    val results: List<ProductValidationSummary>
)
