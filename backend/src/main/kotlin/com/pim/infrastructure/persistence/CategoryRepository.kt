package com.pim.infrastructure.persistence

import com.pim.domain.category.Category
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface CategoryRepository : JpaRepository<Category, UUID> {

    fun findByCode(code: String): Category?

    fun findByName(name: String): Category?

    fun existsByCode(code: String): Boolean

    fun findByUrlKey(urlKey: String): Category?

    @Query("SELECT c FROM Category c WHERE c.parent IS NULL ORDER BY c.position")
    fun findRootCategories(): List<Category>

    @Query("SELECT c FROM Category c WHERE c.parent.id = :parentId ORDER BY c.position")
    fun findByParentId(@Param("parentId") parentId: UUID): List<Category>

    @Query("SELECT c FROM Category c WHERE c.isActive = true ORDER BY c.level, c.position")
    fun findAllActive(): List<Category>

    @Query("SELECT c FROM Category c WHERE c.path LIKE CONCAT(:path, '%') ORDER BY c.level, c.position")
    fun findDescendants(@Param("path") path: String): List<Category>

    @Query("""
        SELECT c FROM Category c
        LEFT JOIN FETCH c.children
        WHERE c.id = :id
    """)
    fun findByIdWithChildren(@Param("id") id: UUID): Category?

    @Query("SELECT c FROM Category c WHERE LOWER(c.name) LIKE LOWER(CONCAT('%', :query, '%'))")
    fun search(@Param("query") query: String): List<Category>

    fun findByNameContainingIgnoreCase(name: String, pageable: Pageable): Page<Category>
}
