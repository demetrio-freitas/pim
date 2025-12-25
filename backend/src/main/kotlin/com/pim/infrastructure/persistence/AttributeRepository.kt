package com.pim.infrastructure.persistence

import com.pim.domain.attribute.Attribute
import com.pim.domain.attribute.AttributeGroup
import com.pim.domain.product.AttributeType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface AttributeRepository : JpaRepository<Attribute, UUID> {

    fun findByCode(code: String): Attribute?

    fun existsByCode(code: String): Boolean

    fun findByType(type: AttributeType): List<Attribute>

    @Query("SELECT a FROM Attribute a WHERE a.isRequired = true")
    fun findRequiredAttributes(): List<Attribute>

    @Query("SELECT a FROM Attribute a WHERE a.isFilterable = true")
    fun findFilterableAttributes(): List<Attribute>

    @Query("SELECT a FROM Attribute a WHERE a.isSearchable = true")
    fun findSearchableAttributes(): List<Attribute>

    @Query("SELECT a FROM Attribute a WHERE a.useInGrid = true ORDER BY a.position")
    fun findGridAttributes(): List<Attribute>

    @Query("SELECT a FROM Attribute a WHERE a.group.id = :groupId ORDER BY a.position")
    fun findByGroupId(@Param("groupId") groupId: UUID): List<Attribute>

    @Query("SELECT a FROM Attribute a WHERE LOWER(a.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(a.code) LIKE LOWER(CONCAT('%', :query, '%'))")
    fun search(@Param("query") query: String): List<Attribute>

    @Query("""
        SELECT a FROM Attribute a
        LEFT JOIN FETCH a.options
        WHERE a.id = :id
    """)
    fun findByIdWithOptions(@Param("id") id: UUID): Attribute?
}

@Repository
interface AttributeGroupRepository : JpaRepository<AttributeGroup, UUID> {

    fun findByCode(code: String): AttributeGroup?

    fun existsByCode(code: String): Boolean

    @Query("SELECT ag FROM AttributeGroup ag ORDER BY ag.position")
    fun findAllOrdered(): List<AttributeGroup>

    @Query("""
        SELECT ag FROM AttributeGroup ag
        LEFT JOIN FETCH ag.attributes
        WHERE ag.id = :id
    """)
    fun findByIdWithAttributes(@Param("id") id: UUID): AttributeGroup?
}
