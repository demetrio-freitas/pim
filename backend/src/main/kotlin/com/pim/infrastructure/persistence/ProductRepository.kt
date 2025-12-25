package com.pim.infrastructure.persistence

import com.pim.domain.product.Product
import com.pim.domain.product.ProductStatus
import com.pim.domain.product.ProductType
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface ProductRepository : JpaRepository<Product, UUID>, JpaSpecificationExecutor<Product> {

    fun findBySku(sku: String): Product?

    fun existsBySku(sku: String): Boolean

    fun findByStatus(status: ProductStatus, pageable: Pageable): Page<Product>

    fun findByType(type: ProductType, pageable: Pageable): Page<Product>

    fun findByStatusAndType(status: ProductStatus, type: ProductType, pageable: Pageable): Page<Product>

    @Query("SELECT p FROM Product p WHERE p.parent IS NULL")
    fun findAllRootProducts(pageable: Pageable): Page<Product>

    @Query("SELECT p FROM Product p JOIN p.categories c WHERE c.id = :categoryId")
    fun findByCategoryId(@Param("categoryId") categoryId: UUID, pageable: Pageable): Page<Product>

    @Query("SELECT p FROM Product p WHERE LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(p.sku) LIKE LOWER(CONCAT('%', :query, '%'))")
    fun search(@Param("query") query: String, pageable: Pageable): Page<Product>

    @Query("""
        SELECT DISTINCT p FROM Product p
        LEFT JOIN FETCH p.media
        WHERE LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%'))
        OR LOWER(p.sku) LIKE LOWER(CONCAT('%', :query, '%'))
    """)
    fun searchWithMedia(@Param("query") query: String, pageable: Pageable): Page<Product>

    @Query("SELECT p FROM Product p WHERE p.completenessScore < :threshold")
    fun findIncompleteProducts(@Param("threshold") threshold: Int, pageable: Pageable): Page<Product>

    @Query("SELECT COUNT(p) FROM Product p WHERE p.status = :status")
    fun countByStatus(@Param("status") status: ProductStatus): Long

    @Query("""
        SELECT DISTINCT p FROM Product p
        LEFT JOIN FETCH p.categories
        WHERE p.id = :id
    """)
    fun findByIdWithCategories(@Param("id") id: UUID): Product?

    @Query("""
        SELECT DISTINCT p FROM Product p
        LEFT JOIN FETCH p.attributes
        WHERE p.id = :id
    """)
    fun findByIdWithAttributes(@Param("id") id: UUID): Product?

    @Query("""
        SELECT DISTINCT p FROM Product p
        LEFT JOIN FETCH p.media
        WHERE p.id = :id
    """)
    fun findByIdWithMedia(@Param("id") id: UUID): Product?

    @Query("SELECT p FROM Product p ORDER BY p.createdAt DESC LIMIT :limit")
    fun findRecentProducts(@Param("limit") limit: Int): List<Product>

    @Query("SELECT p FROM Product p JOIN p.categories c WHERE c.id = :categoryId")
    fun findByCategoriesId(@Param("categoryId") categoryId: UUID, pageable: Pageable): Page<Product>

    @Query("SELECT p FROM Product p JOIN p.categories c WHERE p.status = :status AND c.id = :categoryId")
    fun findByStatusAndCategoriesId(
        @Param("status") status: ProductStatus,
        @Param("categoryId") categoryId: UUID,
        pageable: Pageable
    ): Page<Product>

    @Query("SELECT AVG(p.completenessScore) FROM Product p")
    fun getAverageCompleteness(): Double?

    @Query("SELECT COUNT(p) FROM Product p WHERE p.stockQuantity < :threshold AND p.stockQuantity >= 0")
    fun countLowStock(@Param("threshold") threshold: Int): Long

    @Query("SELECT COUNT(p) FROM Product p WHERE p.media IS EMPTY")
    fun countWithoutImages(): Long

    @Query("SELECT p FROM Product p WHERE p.stockQuantity < :threshold AND p.stockQuantity >= 0")
    fun findLowStock(@Param("threshold") threshold: Int, pageable: Pageable): Page<Product>

    @Query("SELECT p FROM Product p WHERE p.media IS EMPTY")
    fun findWithoutImages(pageable: Pageable): Page<Product>

    @Query("SELECT COUNT(p) FROM Product p JOIN p.categories c WHERE c.id = :categoryId")
    fun countByCategory(@Param("categoryId") categoryId: UUID): Long

    @Query("SELECT COUNT(DISTINCT p) FROM Product p JOIN p.categories c WHERE c.id = :categoryId")
    fun countByCategoriesId(@Param("categoryId") categoryId: UUID): Long

    @Query("SELECT COUNT(DISTINCT p) FROM Product p JOIN p.categories c WHERE p.status = :status AND c.id = :categoryId")
    fun countByStatusAndCategoriesId(
        @Param("status") status: ProductStatus,
        @Param("categoryId") categoryId: UUID
    ): Long

    @Query("SELECT c.id, COUNT(p) FROM Product p JOIN p.categories c GROUP BY c.id")
    fun countProductsByCategory(): List<Array<Any>>

    @Query("SELECT COUNT(p) FROM Product p WHERE p.parent.id = :parentId")
    fun countVariantsByParentId(@Param("parentId") parentId: UUID): Long

    @Query("SELECT p FROM Product p WHERE p.parent.id = :parentId ORDER BY p.createdAt")
    fun findVariantsByParentId(@Param("parentId") parentId: UUID): List<Product>
}
