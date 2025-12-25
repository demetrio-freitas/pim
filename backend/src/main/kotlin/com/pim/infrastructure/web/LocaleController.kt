package com.pim.infrastructure.web

import com.pim.application.LocaleDTO
import com.pim.application.LocaleService
import com.pim.application.ProductTranslationDTO
import com.pim.domain.i18n.Locale
import com.pim.domain.i18n.ProductTranslation
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/locales")
class LocaleController(
    private val localeService: LocaleService
) {

    @GetMapping
    fun getAllLocales(): ResponseEntity<List<Locale>> {
        return ResponseEntity.ok(localeService.getAllLocales())
    }

    @GetMapping("/active")
    fun getActiveLocales(): ResponseEntity<List<Locale>> {
        return ResponseEntity.ok(localeService.getActiveLocales())
    }

    @GetMapping("/default")
    fun getDefaultLocale(): ResponseEntity<Locale?> {
        return ResponseEntity.ok(localeService.getDefaultLocale())
    }

    @GetMapping("/{id}")
    fun getLocale(@PathVariable id: UUID): ResponseEntity<Locale> {
        return ResponseEntity.ok(localeService.getLocale(id))
    }

    @PostMapping
    @PreAuthorize("hasAuthority('settings.write')")
    fun createLocale(@RequestBody dto: LocaleDTO): ResponseEntity<Locale> {
        return ResponseEntity.ok(localeService.createLocale(dto))
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('settings.write')")
    fun updateLocale(
        @PathVariable id: UUID,
        @RequestBody dto: LocaleDTO
    ): ResponseEntity<Locale> {
        return ResponseEntity.ok(localeService.updateLocale(id, dto))
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('settings.write')")
    fun deleteLocale(@PathVariable id: UUID): ResponseEntity<Void> {
        localeService.deleteLocale(id)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/initialize")
    @PreAuthorize("hasAuthority('settings.write')")
    fun initializeLocales(): ResponseEntity<Map<String, String>> {
        localeService.initializeDefaultLocales()
        return ResponseEntity.ok(mapOf("message" to "Default locales initialized"))
    }
}

@RestController
@RequestMapping("/api/products/{productId}/translations")
class ProductTranslationController(
    private val localeService: LocaleService
) {

    @GetMapping
    @PreAuthorize("hasAuthority('products.read')")
    fun getTranslations(@PathVariable productId: UUID): ResponseEntity<List<ProductTranslation>> {
        return ResponseEntity.ok(localeService.getProductTranslations(productId))
    }

    @GetMapping("/{localeCode}")
    @PreAuthorize("hasAuthority('products.read')")
    fun getTranslation(
        @PathVariable productId: UUID,
        @PathVariable localeCode: String
    ): ResponseEntity<ProductTranslation?> {
        return ResponseEntity.ok(localeService.getProductTranslation(productId, localeCode))
    }

    @PutMapping("/{localeCode}")
    @PreAuthorize("hasAuthority('products.write')")
    fun saveTranslation(
        @PathVariable productId: UUID,
        @PathVariable localeCode: String,
        @RequestBody dto: ProductTranslationDTO
    ): ResponseEntity<ProductTranslation> {
        val translation = dto.copy(localeCode = localeCode)
        return ResponseEntity.ok(localeService.saveProductTranslation(productId, translation))
    }

    @PutMapping
    @PreAuthorize("hasAuthority('products.write')")
    fun saveAllTranslations(
        @PathVariable productId: UUID,
        @RequestBody translations: List<ProductTranslationDTO>
    ): ResponseEntity<List<ProductTranslation>> {
        return ResponseEntity.ok(localeService.saveProductTranslations(productId, translations))
    }

    @DeleteMapping("/{localeCode}")
    @PreAuthorize("hasAuthority('products.write')")
    fun deleteTranslation(
        @PathVariable productId: UUID,
        @PathVariable localeCode: String
    ): ResponseEntity<Void> {
        localeService.deleteProductTranslation(productId, localeCode)
        return ResponseEntity.noContent().build()
    }
}
