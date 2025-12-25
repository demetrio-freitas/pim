package com.pim.application

import com.pim.domain.i18n.*
import com.pim.infrastructure.persistence.*
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

data class LocaleDTO(
    val id: UUID? = null,
    val code: String,
    val name: String,
    val isActive: Boolean = true,
    val isDefault: Boolean = false,
    val flagIcon: String? = null
)

data class ProductTranslationDTO(
    val localeCode: String,
    val name: String? = null,
    val description: String? = null,
    val shortDescription: String? = null,
    val metaTitle: String? = null,
    val metaDescription: String? = null,
    val metaKeywords: String? = null,
    val urlKey: String? = null
)

@Service
@Transactional
class LocaleService(
    private val localeRepository: LocaleRepository,
    private val productTranslationRepository: ProductTranslationRepository,
    private val categoryTranslationRepository: CategoryTranslationRepository,
    private val attributeValueTranslationRepository: AttributeValueTranslationRepository
) {

    fun initializeDefaultLocales() {
        if (localeRepository.count() == 0L) {
            val locales = listOf(
                Locale(code = "pt-BR", name = "Português (Brasil)", isDefault = true, flagIcon = "🇧🇷"),
                Locale(code = "en-US", name = "English (US)", flagIcon = "🇺🇸"),
                Locale(code = "es-ES", name = "Español (España)", flagIcon = "🇪🇸"),
                Locale(code = "de-DE", name = "Deutsch (Deutschland)", flagIcon = "🇩🇪"),
                Locale(code = "fr-FR", name = "Français (France)", flagIcon = "🇫🇷"),
                Locale(code = "it-IT", name = "Italiano (Italia)", flagIcon = "🇮🇹"),
                Locale(code = "ja-JP", name = "日本語 (日本)", flagIcon = "🇯🇵"),
                Locale(code = "zh-CN", name = "中文 (中国)", flagIcon = "🇨🇳")
            )
            localeRepository.saveAll(locales)
        }
    }

    fun getAllLocales(): List<Locale> = localeRepository.findAll()

    fun getActiveLocales(): List<Locale> = localeRepository.findByIsActiveTrue()

    fun getDefaultLocale(): Locale? = localeRepository.findByIsDefaultTrue()

    fun getLocale(id: UUID): Locale = localeRepository.findById(id)
        .orElseThrow { IllegalArgumentException("Locale not found") }

    fun getLocaleByCode(code: String): Locale? = localeRepository.findByCode(code)

    fun createLocale(dto: LocaleDTO): Locale {
        if (localeRepository.existsByCode(dto.code)) {
            throw IllegalArgumentException("Locale with code ${dto.code} already exists")
        }

        if (dto.isDefault) {
            // Remove default from other locales
            localeRepository.findByIsDefaultTrue()?.let {
                localeRepository.save(it.copy(isDefault = false))
            }
        }

        val locale = Locale(
            code = dto.code,
            name = dto.name,
            isActive = dto.isActive,
            isDefault = dto.isDefault,
            flagIcon = dto.flagIcon
        )

        return localeRepository.save(locale)
    }

    fun updateLocale(id: UUID, dto: LocaleDTO): Locale {
        val locale = getLocale(id)

        if (dto.isDefault && !locale.isDefault) {
            // Remove default from other locales
            localeRepository.findByIsDefaultTrue()?.let {
                if (it.id != id) {
                    localeRepository.save(it.copy(isDefault = false))
                }
            }
        }

        val updated = locale.copy(
            name = dto.name,
            isActive = dto.isActive,
            isDefault = dto.isDefault,
            flagIcon = dto.flagIcon
        )

        return localeRepository.save(updated)
    }

    fun deleteLocale(id: UUID) {
        val locale = getLocale(id)
        if (locale.isDefault) {
            throw IllegalArgumentException("Cannot delete default locale")
        }
        localeRepository.delete(locale)
    }

    // Product Translations

    fun getProductTranslations(productId: UUID): List<ProductTranslation> {
        return productTranslationRepository.findAllByProductIdWithLocale(productId)
    }

    fun getProductTranslation(productId: UUID, localeCode: String): ProductTranslation? {
        return productTranslationRepository.findByProductIdAndLocaleCode(productId, localeCode)
    }

    fun saveProductTranslation(productId: UUID, dto: ProductTranslationDTO): ProductTranslation {
        val locale = getLocaleByCode(dto.localeCode)
            ?: throw IllegalArgumentException("Locale ${dto.localeCode} not found")

        val existing = productTranslationRepository.findByProductIdAndLocaleId(productId, locale.id)

        val translation = existing?.copy(
            name = dto.name,
            description = dto.description,
            shortDescription = dto.shortDescription,
            metaTitle = dto.metaTitle,
            metaDescription = dto.metaDescription,
            metaKeywords = dto.metaKeywords,
            urlKey = dto.urlKey,
            updatedAt = Instant.now()
        ) ?: ProductTranslation(
            productId = productId,
            locale = locale,
            name = dto.name,
            description = dto.description,
            shortDescription = dto.shortDescription,
            metaTitle = dto.metaTitle,
            metaDescription = dto.metaDescription,
            metaKeywords = dto.metaKeywords,
            urlKey = dto.urlKey
        )

        return productTranslationRepository.save(translation)
    }

    fun saveProductTranslations(productId: UUID, translations: List<ProductTranslationDTO>): List<ProductTranslation> {
        return translations.map { saveProductTranslation(productId, it) }
    }

    fun deleteProductTranslation(productId: UUID, localeCode: String) {
        val locale = getLocaleByCode(localeCode)
            ?: throw IllegalArgumentException("Locale $localeCode not found")
        val translation = productTranslationRepository.findByProductIdAndLocaleId(productId, locale.id)
        translation?.let { productTranslationRepository.delete(it) }
    }

    // Category Translations

    fun getCategoryTranslations(categoryId: UUID): List<CategoryTranslation> {
        return categoryTranslationRepository.findAllByCategoryIdWithLocale(categoryId)
    }

    fun getCategoryTranslation(categoryId: UUID, localeCode: String): CategoryTranslation? {
        return categoryTranslationRepository.findByCategoryIdAndLocaleCode(categoryId, localeCode)
    }

    fun saveCategoryTranslation(categoryId: UUID, localeCode: String, name: String?, description: String?): CategoryTranslation {
        val locale = getLocaleByCode(localeCode)
            ?: throw IllegalArgumentException("Locale $localeCode not found")

        val existing = categoryTranslationRepository.findByCategoryIdAndLocaleId(categoryId, locale.id)

        val translation = existing?.copy(
            name = name,
            description = description,
            updatedAt = Instant.now()
        ) ?: CategoryTranslation(
            categoryId = categoryId,
            locale = locale,
            name = name,
            description = description
        )

        return categoryTranslationRepository.save(translation)
    }
}
