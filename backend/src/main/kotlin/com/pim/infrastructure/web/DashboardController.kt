package com.pim.infrastructure.web

import com.pim.application.ProductService
import com.pim.application.CategoryService
import com.pim.application.AttributeService
import com.pim.application.ProductStatistics
import com.pim.domain.product.ProductStatus
import com.pim.infrastructure.persistence.AuditLogRepository
import com.pim.infrastructure.persistence.MediaLibraryRepository
import com.pim.infrastructure.persistence.ProductRepository
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.data.domain.PageRequest
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*
import java.time.Instant
import java.time.temporal.ChronoUnit

@RestController
@RequestMapping("/api/dashboard")
@Tag(name = "Dashboard", description = "Dashboard and statistics endpoints")
class DashboardController(
    private val productService: ProductService,
    private val categoryService: CategoryService,
    private val attributeService: AttributeService,
    private val productRepository: ProductRepository,
    private val auditLogRepository: AuditLogRepository,
    private val mediaLibraryRepository: MediaLibraryRepository
) {

    @GetMapping("/stats")
    @Operation(summary = "Get dashboard statistics")
    @PreAuthorize("hasAuthority('products.view')")
    fun getStats(): ResponseEntity<DashboardStats> {
        val productStats = productService.getStatistics()
        val categoryCount = categoryService.findAll().size
        val attributeCount = attributeService.findAllAttributes().size
        val attributeGroupCount = attributeService.findAllGroups().size

        return ResponseEntity.ok(
            DashboardStats(
                products = productStats,
                categoryCount = categoryCount,
                attributeCount = attributeCount,
                attributeGroupCount = attributeGroupCount
            )
        )
    }

    @GetMapping("/stats/advanced")
    @Operation(summary = "Get advanced dashboard statistics")
    @PreAuthorize("isAuthenticated()")
    fun getAdvancedStats(): ResponseEntity<AdvancedDashboardStats> {
        val productStats = productService.getStatistics()
        val categories = categoryService.findAll()
        val attributes = attributeService.findAllAttributes()

        // Media stats
        val totalMedia = mediaLibraryRepository.count()
        val storageUsed = mediaLibraryRepository.getTotalStorageUsed() ?: 0L

        // Completeness distribution
        val allProducts = productRepository.findAll()
        val completenessDistribution = CompletenessDistribution(
            excellent = allProducts.count { (it.completenessScore ?: 0) >= 90 }.toLong(),
            good = allProducts.count { val s = it.completenessScore ?: 0; s in 70..89 }.toLong(),
            average = allProducts.count { val s = it.completenessScore ?: 0; s in 50..69 }.toLong(),
            poor = allProducts.count { (it.completenessScore ?: 0) < 50 }.toLong()
        )

        // Products by category (top 10)
        val productsByCategory = categories
            .map { category ->
                CategoryProductCount(
                    categoryId = category.id.toString(),
                    categoryName = category.name,
                    productCount = allProducts.count { p -> p.categories.any { it.id == category.id } }.toLong()
                )
            }
            .sortedByDescending { it.productCount }
            .take(10)

        // Recent activity
        val oneWeekAgo = Instant.now().minus(7, ChronoUnit.DAYS)
        val recentActivity = try {
            auditLogRepository.findRecentLogs(oneWeekAgo, PageRequest.of(0, 10))
                .content
                .map { log ->
                    RecentActivityItem(
                        id = log.id.toString(),
                        type = log.entityType.name,
                        action = log.action.name,
                        entityName = log.entityName,
                        userName = log.userName,
                        createdAt = log.createdAt
                    )
                }
        } catch (e: Exception) {
            emptyList()
        }

        // Trends
        val twoWeeksAgo = Instant.now().minus(14, ChronoUnit.DAYS)
        val newProductsThisWeek = allProducts.count { it.createdAt.isAfter(oneWeekAgo) }.toLong()
        val newProductsLastWeek = allProducts.count {
            it.createdAt.isAfter(twoWeeksAgo) && it.createdAt.isBefore(oneWeekAgo)
        }.toLong()

        val trends = TrendsInfo(
            newProductsThisWeek = newProductsThisWeek,
            newProductsLastWeek = newProductsLastWeek,
            productGrowth = if (newProductsLastWeek > 0) {
                ((newProductsThisWeek - newProductsLastWeek).toDouble() / newProductsLastWeek * 100).toInt()
            } else 0
        )

        // Calculate average completeness
        val avgCompleteness = if (allProducts.isNotEmpty()) {
            allProducts.mapNotNull { it.completenessScore }.average()
        } else 0.0

        val incompleteCount = allProducts.count { (it.completenessScore ?: 0) < 80 }.toLong()

        return ResponseEntity.ok(
            AdvancedDashboardStats(
                totalProducts = productStats.total,
                activeProducts = productStats.published,
                draftProducts = productStats.draft,
                archivedProducts = productStats.archived,
                totalCategories = categories.size,
                totalAttributes = attributes.size,
                totalMedia = totalMedia,
                storageUsed = storageUsed,
                averageCompleteness = avgCompleteness,
                incompleteProducts = incompleteCount,
                completenessDistribution = completenessDistribution,
                productsByCategory = productsByCategory,
                recentActivity = recentActivity,
                trends = trends
            )
        )
    }

    @GetMapping("/recent-products")
    @Operation(summary = "Get recent products")
    @PreAuthorize("hasAuthority('products.view')")
    fun getRecentProducts(@RequestParam(defaultValue = "10") limit: Int): ResponseEntity<List<ProductResponse>> {
        val products = productService.findRecent(limit)
        return ResponseEntity.ok(products.map { it.toResponse() })
    }

    @GetMapping("/products-by-status")
    @Operation(summary = "Get product count by status")
    @PreAuthorize("hasAuthority('products.view')")
    fun getProductsByStatus(): ResponseEntity<Map<ProductStatus, Long>> {
        return ResponseEntity.ok(productService.countByStatus())
    }
}

data class DashboardStats(
    val products: ProductStatistics,
    val categoryCount: Int,
    val attributeCount: Int,
    val attributeGroupCount: Int
)

data class AdvancedDashboardStats(
    val totalProducts: Long,
    val activeProducts: Long,
    val draftProducts: Long,
    val archivedProducts: Long,
    val totalCategories: Int,
    val totalAttributes: Int,
    val totalMedia: Long,
    val storageUsed: Long,
    val averageCompleteness: Double,
    val incompleteProducts: Long,
    val completenessDistribution: CompletenessDistribution,
    val productsByCategory: List<CategoryProductCount>,
    val recentActivity: List<RecentActivityItem>,
    val trends: TrendsInfo
)

data class CompletenessDistribution(
    val excellent: Long,
    val good: Long,
    val average: Long,
    val poor: Long
)

data class CategoryProductCount(
    val categoryId: String,
    val categoryName: String,
    val productCount: Long
)

data class RecentActivityItem(
    val id: String,
    val type: String,
    val action: String,
    val entityName: String?,
    val userName: String?,
    val createdAt: Instant
)

data class TrendsInfo(
    val newProductsThisWeek: Long,
    val newProductsLastWeek: Long,
    val productGrowth: Int
)
