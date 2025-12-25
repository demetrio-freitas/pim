package com.pim.infrastructure.persistence

import com.pim.domain.i18n.*
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface LocaleRepository : JpaRepository<Locale, UUID> {

    fun findByCode(code: String): Locale?

    fun findByIsActiveTrue(): List<Locale>

    fun findByIsDefaultTrue(): Locale?

    fun existsByCode(code: String): Boolean
}

@Repository
interface ProductTranslationRepository : JpaRepository<ProductTranslation, UUID> {

    fun findByProductId(productId: UUID): List<ProductTranslation>

    fun findByProductIdAndLocaleCode(productId: UUID, localeCode: String): ProductTranslation?

    fun findByProductIdAndLocaleId(productId: UUID, localeId: UUID): ProductTranslation?

    @Query("""
        SELECT t FROM ProductTranslation t
        JOIN FETCH t.locale
        WHERE t.productId = :productId
    """)
    fun findAllByProductIdWithLocale(productId: UUID): List<ProductTranslation>

    fun deleteByProductId(productId: UUID)
}

@Repository
interface CategoryTranslationRepository : JpaRepository<CategoryTranslation, UUID> {

    fun findByCategoryId(categoryId: UUID): List<CategoryTranslation>

    fun findByCategoryIdAndLocaleCode(categoryId: UUID, localeCode: String): CategoryTranslation?

    fun findByCategoryIdAndLocaleId(categoryId: UUID, localeId: UUID): CategoryTranslation?

    @Query("""
        SELECT t FROM CategoryTranslation t
        JOIN FETCH t.locale
        WHERE t.categoryId = :categoryId
    """)
    fun findAllByCategoryIdWithLocale(categoryId: UUID): List<CategoryTranslation>

    fun deleteByCategoryId(categoryId: UUID)
}

@Repository
interface AttributeValueTranslationRepository : JpaRepository<AttributeValueTranslation, UUID> {

    fun findByAttributeValueId(attributeValueId: UUID): List<AttributeValueTranslation>

    fun findByAttributeValueIdAndLocaleCode(attributeValueId: UUID, localeCode: String): AttributeValueTranslation?

    fun findByAttributeValueIdAndLocaleId(attributeValueId: UUID, localeId: UUID): AttributeValueTranslation?

    fun deleteByAttributeValueId(attributeValueId: UUID)
}
