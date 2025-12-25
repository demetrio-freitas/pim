package com.pim.infrastructure.web

import com.pim.application.IndexStats
import com.pim.application.SearchAdminService
import com.pim.domain.product.ProductStatus
import com.pim.domain.product.ProductType
import com.pim.infrastructure.search.ProductDocument
import com.pim.infrastructure.search.ProductSearchCriteria
import com.pim.infrastructure.search.ProductSearchService
import com.pim.infrastructure.search.ProductSuggestion
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PageableDefault
import org.springframework.http.ResponseEntity
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*
import java.util.*

@RestController
@RequestMapping("/api/search")
@Tag(name = "Search", description = "Full-text search API for products")
@ConditionalOnProperty(value = ["elasticsearch.enabled"], havingValue = "true", matchIfMissing = false)
class SearchController(
    private val productSearchService: ProductSearchService,
    private val searchAdminService: SearchAdminService
) {

    @GetMapping("/products")
    @PreAuthorize("hasAnyRole('ADMIN', 'EDITOR', 'VIEWER')")
    @Operation(summary = "Search products with advanced criteria")
    fun searchProducts(
        @RequestParam(required = false) q: String?,
        @RequestParam(required = false) status: ProductStatus?,
        @RequestParam(required = false) type: ProductType?,
        @RequestParam(required = false) brand: String?,
        @RequestParam(required = false) categoryId: UUID?,
        @RequestParam(required = false) inStock: Boolean?,
        @RequestParam(required = false) minPrice: Double?,
        @RequestParam(required = false) maxPrice: Double?,
        @RequestParam(required = false) minCompleteness: Int?,
        @PageableDefault(size = 20) pageable: Pageable
    ): ResponseEntity<Page<ProductDocument>> {
        val criteria = ProductSearchCriteria(
            text = q,
            status = status,
            type = type,
            brand = brand,
            categoryId = categoryId,
            inStock = inStock,
            minPrice = minPrice,
            maxPrice = maxPrice,
            minCompleteness = minCompleteness
        )

        val results = productSearchService.search(criteria, pageable)
        return ResponseEntity.ok(results)
    }

    @GetMapping("/products/simple")
    @PreAuthorize("hasAnyRole('ADMIN', 'EDITOR', 'VIEWER')")
    @Operation(summary = "Simple text search across products")
    fun simpleSearch(
        @RequestParam q: String,
        @PageableDefault(size = 20) pageable: Pageable
    ): ResponseEntity<Page<ProductDocument>> {
        val results = productSearchService.simpleSearch(q, pageable)
        return ResponseEntity.ok(results)
    }

    @GetMapping("/products/autocomplete")
    @PreAuthorize("hasAnyRole('ADMIN', 'EDITOR', 'VIEWER')")
    @Operation(summary = "Autocomplete product names")
    fun autocomplete(
        @RequestParam prefix: String,
        @RequestParam(defaultValue = "10") limit: Int
    ): ResponseEntity<List<String>> {
        val suggestions = productSearchService.autocomplete(prefix, limit)
        return ResponseEntity.ok(suggestions)
    }

    @GetMapping("/products/suggest")
    @PreAuthorize("hasAnyRole('ADMIN', 'EDITOR', 'VIEWER')")
    @Operation(summary = "Get product suggestions based on text")
    fun suggest(
        @RequestParam q: String,
        @RequestParam(defaultValue = "5") limit: Int
    ): ResponseEntity<List<ProductSuggestion>> {
        val suggestions = productSearchService.suggest(q, limit)
        return ResponseEntity.ok(suggestions)
    }

    @GetMapping("/products/by-status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN', 'EDITOR', 'VIEWER')")
    @Operation(summary = "Find products by status")
    fun findByStatus(
        @PathVariable status: ProductStatus,
        @PageableDefault(size = 20) pageable: Pageable
    ): ResponseEntity<Page<ProductDocument>> {
        val results = productSearchService.findByStatus(status, pageable)
        return ResponseEntity.ok(results)
    }

    @GetMapping("/products/by-category/{categoryId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'EDITOR', 'VIEWER')")
    @Operation(summary = "Find products by category")
    fun findByCategory(
        @PathVariable categoryId: UUID,
        @PageableDefault(size = 20) pageable: Pageable
    ): ResponseEntity<Page<ProductDocument>> {
        val results = productSearchService.findByCategory(categoryId, pageable)
        return ResponseEntity.ok(results)
    }

    @GetMapping("/products/in-stock")
    @PreAuthorize("hasAnyRole('ADMIN', 'EDITOR', 'VIEWER')")
    @Operation(summary = "Find products in stock")
    fun findInStock(
        @PageableDefault(size = 20) pageable: Pageable
    ): ResponseEntity<Page<ProductDocument>> {
        val results = productSearchService.findInStock(pageable)
        return ResponseEntity.ok(results)
    }

    @GetMapping("/products/published-available")
    @PreAuthorize("hasAnyRole('ADMIN', 'EDITOR', 'VIEWER')")
    @Operation(summary = "Find published products in stock")
    fun findPublishedInStock(
        @PageableDefault(size = 20) pageable: Pageable
    ): ResponseEntity<Page<ProductDocument>> {
        val results = productSearchService.findPublishedInStock(pageable)
        return ResponseEntity.ok(results)
    }

    @GetMapping("/products/by-price-range")
    @PreAuthorize("hasAnyRole('ADMIN', 'EDITOR', 'VIEWER')")
    @Operation(summary = "Find products within price range")
    fun findByPriceRange(
        @RequestParam minPrice: Double,
        @RequestParam maxPrice: Double,
        @PageableDefault(size = 20) pageable: Pageable
    ): ResponseEntity<Page<ProductDocument>> {
        val results = productSearchService.findByPriceRange(minPrice, maxPrice, pageable)
        return ResponseEntity.ok(results)
    }

    @GetMapping("/products/by-completeness")
    @PreAuthorize("hasAnyRole('ADMIN', 'EDITOR', 'VIEWER')")
    @Operation(summary = "Find products with minimum completeness score")
    fun findByMinCompleteness(
        @RequestParam minScore: Int,
        @PageableDefault(size = 20) pageable: Pageable
    ): ResponseEntity<Page<ProductDocument>> {
        val results = productSearchService.findByMinCompleteness(minScore, pageable)
        return ResponseEntity.ok(results)
    }

    @GetMapping("/products/stats/by-status")
    @PreAuthorize("hasAnyRole('ADMIN', 'EDITOR', 'VIEWER')")
    @Operation(summary = "Get product count by status")
    fun countByStatus(): ResponseEntity<Map<String, Long>> {
        return ResponseEntity.ok(productSearchService.countByStatus())
    }

    @PostMapping("/products/reindex")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Reindex all products (admin only)")
    fun reindexAll(): ResponseEntity<Map<String, String>> {
        searchAdminService.reindexAllProducts()
        return ResponseEntity.ok(mapOf("message" to "Reindex triggered. Check logs for progress."))
    }

    @GetMapping("/admin/stats")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get index statistics (admin only)")
    fun getIndexStats(): ResponseEntity<IndexStats> {
        return ResponseEntity.ok(searchAdminService.getIndexStats())
    }
}
