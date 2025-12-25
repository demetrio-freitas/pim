package com.pim.infrastructure.persistence

import com.pim.domain.media.Media
import com.pim.domain.product.MediaType
import com.pim.domain.product.ProductMedia
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface MediaLibraryRepository : JpaRepository<Media, UUID> {

    fun findByType(type: MediaType, pageable: Pageable): Page<Media>

    fun findByFolder(folder: String, pageable: Pageable): Page<Media>

    @Query("SELECT m FROM Media m WHERE m.folder IS NULL")
    fun findRootMedia(pageable: Pageable): Page<Media>

    @Query("SELECT DISTINCT m.folder FROM Media m WHERE m.folder IS NOT NULL ORDER BY m.folder")
    fun findAllFolders(): List<String>

    @Query("SELECT m FROM Media m WHERE :tag MEMBER OF m.tags")
    fun findByTag(@Param("tag") tag: String, pageable: Pageable): Page<Media>

    @Query("""
        SELECT m FROM Media m
        WHERE LOWER(m.originalName) LIKE LOWER(CONCAT('%', :query, '%'))
        OR LOWER(m.title) LIKE LOWER(CONCAT('%', :query, '%'))
        OR LOWER(m.description) LIKE LOWER(CONCAT('%', :query, '%'))
    """)
    fun search(@Param("query") query: String, pageable: Pageable): Page<Media>

    @Query("SELECT SUM(m.size) FROM Media m")
    fun getTotalStorageUsed(): Long?

    @Query("SELECT COUNT(m) FROM Media m WHERE m.type = :type")
    fun countByType(@Param("type") type: MediaType): Long
}

@Repository
interface ProductMediaRepository : JpaRepository<ProductMedia, UUID> {

    fun findByProductIdOrderByPosition(productId: UUID): List<ProductMedia>

    @Query("SELECT pm FROM ProductMedia pm WHERE pm.product.id = :productId AND pm.isMain = true")
    fun findMainImage(@Param("productId") productId: UUID): ProductMedia?

    @Query("SELECT COUNT(pm) FROM ProductMedia pm WHERE pm.product.id = :productId")
    fun countByProductId(@Param("productId") productId: UUID): Long

    fun deleteByProductId(productId: UUID)
}
