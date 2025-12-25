package com.pim.infrastructure.web

import com.pim.application.ai.*
import com.pim.domain.ai.AIProviderType
import com.pim.domain.user.User
import com.pim.infrastructure.persistence.UserRepository
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PageableDefault
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.web.bind.annotation.*
import java.util.*

@RestController
@RequestMapping("/api/ai")
@Tag(name = "AI Services", description = "AI-powered content generation and product enrichment")
class AIController(
    private val contentService: AIContentService,
    private val providerService: AIProviderService,
    private val scraperService: ImageScraperService,
    private val userRepository: UserRepository
) {
    private fun getUser(userDetails: UserDetails): User? {
        return userRepository.findByEmail(userDetails.username)
    }

    // ==================== Content Generation ====================

    @PostMapping("/generate/description")
    @Operation(summary = "Generate product descriptions using AI")
    @PreAuthorize("hasAuthority('products.edit')")
    fun generateDescription(
        @RequestBody request: GenerateDescriptionRequest,
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<AIOperationResult<GeneratedDescription>> {
        val user = getUser(userDetails)
        val result = contentService.generateDescription(request, user?.id)
        return ResponseEntity.ok(result)
    }

    @PostMapping("/generate/seo")
    @Operation(summary = "Generate SEO content for products")
    @PreAuthorize("hasAuthority('products.edit')")
    fun generateSEO(
        @RequestBody request: GenerateSEORequest,
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<AIOperationResult<GeneratedSEO>> {
        val user = getUser(userDetails)
        val result = contentService.generateSEO(request, user?.id)
        return ResponseEntity.ok(result)
    }

    @PostMapping("/generate/marketplace")
    @Operation(summary = "Generate marketplace-optimized content")
    @PreAuthorize("hasAuthority('products.edit')")
    fun generateMarketplaceContent(
        @RequestBody request: GenerateMarketplaceContentRequest,
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<AIOperationResult<GeneratedMarketplaceContent>> {
        val user = getUser(userDetails)
        val result = contentService.generateMarketplaceContent(request, user?.id)
        return ResponseEntity.ok(result)
    }

    @PostMapping("/translate")
    @Operation(summary = "Translate product content")
    @PreAuthorize("hasAuthority('products.edit')")
    fun translateContent(
        @RequestBody request: TranslateContentRequest,
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<AIOperationResult<TranslatedContent>> {
        val user = getUser(userDetails)
        val result = contentService.translateContent(request, user?.id)
        return ResponseEntity.ok(result)
    }

    @PostMapping("/enrich")
    @Operation(summary = "Enrich product data with AI suggestions")
    @PreAuthorize("hasAuthority('products.edit')")
    fun enrichProduct(
        @RequestBody request: EnrichProductRequest,
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<AIOperationResult<EnrichedProduct>> {
        val user = getUser(userDetails)
        val result = contentService.enrichProduct(request, user?.id)
        return ResponseEntity.ok(result)
    }

    // ==================== Provider Management ====================

    @PostMapping("/providers")
    @Operation(summary = "Create a new AI provider")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun createProvider(
        @RequestBody request: AIProviderCreateRequest
    ): ResponseEntity<AIProviderResponse> {
        val created = providerService.createProvider(request)
        return ResponseEntity.status(HttpStatus.CREATED).body(created)
    }

    @GetMapping("/providers")
    @Operation(summary = "List all AI providers")
    @PreAuthorize("hasAuthority('settings.view')")
    fun listProviders(
        @PageableDefault(size = 20) pageable: Pageable
    ): ResponseEntity<Page<AIProviderResponse>> {
        return ResponseEntity.ok(providerService.getAllProviders(pageable))
    }

    @GetMapping("/providers/active")
    @Operation(summary = "List active AI providers")
    @PreAuthorize("hasAuthority('settings.view')")
    fun listActiveProviders(): ResponseEntity<List<AIProviderResponse>> {
        return ResponseEntity.ok(providerService.getActiveProviders())
    }

    @GetMapping("/providers/{id}")
    @Operation(summary = "Get AI provider by ID")
    @PreAuthorize("hasAuthority('settings.view')")
    fun getProvider(@PathVariable id: UUID): ResponseEntity<AIProviderResponse> {
        val provider = providerService.getProvider(id)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(provider)
    }

    @PutMapping("/providers/{id}")
    @Operation(summary = "Update AI provider")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun updateProvider(
        @PathVariable id: UUID,
        @RequestBody request: AIProviderUpdateRequest
    ): ResponseEntity<AIProviderResponse> {
        val updated = providerService.updateProvider(id, request)
        return ResponseEntity.ok(updated)
    }

    @DeleteMapping("/providers/{id}")
    @Operation(summary = "Delete AI provider")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun deleteProvider(@PathVariable id: UUID): ResponseEntity<Void> {
        providerService.deleteProvider(id)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/providers/{id}/test")
    @Operation(summary = "Test AI provider connection")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun testProvider(@PathVariable id: UUID): ResponseEntity<Map<String, Any>> {
        val result = providerService.testConnection(id)
        return ResponseEntity.ok(result)
    }

    @GetMapping("/providers/types")
    @Operation(summary = "Get available AI provider types")
    @PreAuthorize("hasAuthority('settings.view')")
    fun getProviderTypes(): ResponseEntity<List<Map<String, Any>>> {
        val types = AIProviderType.entries.map { type ->
            mapOf(
                "value" to type.name,
                "label" to when (type) {
                    AIProviderType.OPENAI -> "OpenAI"
                    AIProviderType.ANTHROPIC -> "Anthropic (Claude)"
                    AIProviderType.GOOGLE -> "Google AI"
                    AIProviderType.AZURE_OPENAI -> "Azure OpenAI"
                },
                "models" to when (type) {
                    AIProviderType.OPENAI -> listOf("gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo")
                    AIProviderType.ANTHROPIC -> listOf("claude-3-5-sonnet-20241022", "claude-3-opus-20240229", "claude-3-haiku-20240307")
                    AIProviderType.GOOGLE -> listOf("gemini-pro", "gemini-pro-vision")
                    AIProviderType.AZURE_OPENAI -> listOf("gpt-4o-mini", "gpt-4o", "gpt-4-turbo")
                }
            )
        }
        return ResponseEntity.ok(types)
    }

    // ==================== Usage Stats ====================

    @GetMapping("/usage/stats")
    @Operation(summary = "Get AI usage statistics")
    @PreAuthorize("hasAuthority('settings.view')")
    fun getUsageStats(
        @RequestParam(defaultValue = "30") days: Int
    ): ResponseEntity<AIUsageStatsResponse> {
        return ResponseEntity.ok(providerService.getUsageStats(days))
    }

    // ==================== Prompts ====================

    @PostMapping("/prompts")
    @Operation(summary = "Create a custom prompt")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun createPrompt(
        @RequestBody request: AIPromptCreateRequest
    ): ResponseEntity<AIPromptResponse> {
        val created = providerService.createPrompt(request)
        return ResponseEntity.status(HttpStatus.CREATED).body(created)
    }

    @GetMapping("/prompts")
    @Operation(summary = "List all prompts")
    @PreAuthorize("hasAuthority('settings.view')")
    fun listPrompts(): ResponseEntity<List<AIPromptResponse>> {
        return ResponseEntity.ok(providerService.getAllPrompts())
    }

    @GetMapping("/prompts/category/{category}")
    @Operation(summary = "List prompts by category")
    @PreAuthorize("hasAuthority('settings.view')")
    fun listPromptsByCategory(
        @PathVariable category: String
    ): ResponseEntity<List<AIPromptResponse>> {
        return ResponseEntity.ok(providerService.getPromptsByCategory(category))
    }

    @GetMapping("/prompts/{code}")
    @Operation(summary = "Get prompt by code")
    @PreAuthorize("hasAuthority('settings.view')")
    fun getPrompt(@PathVariable code: String): ResponseEntity<AIPromptResponse> {
        val prompt = providerService.getPrompt(code)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(prompt)
    }

    @PutMapping("/prompts/{id}")
    @Operation(summary = "Update prompt")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun updatePrompt(
        @PathVariable id: UUID,
        @RequestBody request: AIPromptCreateRequest
    ): ResponseEntity<AIPromptResponse> {
        val updated = providerService.updatePrompt(id, request)
        return ResponseEntity.ok(updated)
    }

    @DeleteMapping("/prompts/{id}")
    @Operation(summary = "Delete prompt")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun deletePrompt(@PathVariable id: UUID): ResponseEntity<Void> {
        providerService.deletePrompt(id)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/prompts/initialize")
    @Operation(summary = "Initialize default prompts")
    @PreAuthorize("hasAuthority('settings.edit')")
    fun initializePrompts(): ResponseEntity<Map<String, String>> {
        providerService.initializeDefaultPrompts()
        return ResponseEntity.ok(mapOf("message" to "Prompts padrão inicializados"))
    }

    // ==================== Web Scraping ====================

    @PostMapping("/scrape")
    @Operation(summary = "Scrape product data from URL including images")
    @PreAuthorize("hasAuthority('products.create')")
    fun scrapeProductUrl(
        @RequestBody request: ScrapeRequest
    ): ResponseEntity<ScrapedProductData> {
        val result = scraperService.scrapeProductPage(request.url)
        return ResponseEntity.ok(result)
    }

    // ==================== Quick Actions ====================

    @GetMapping("/actions")
    @Operation(summary = "Get available AI actions")
    @PreAuthorize("hasAuthority('products.view')")
    fun getAvailableActions(): ResponseEntity<List<Map<String, Any>>> {
        val actions = listOf(
            mapOf(
                "code" to "generate_description",
                "name" to "Gerar Descrição",
                "description" to "Gera descrições curta e completa para o produto",
                "icon" to "file-text",
                "category" to "content"
            ),
            mapOf(
                "code" to "generate_seo",
                "name" to "Otimizar SEO",
                "description" to "Gera meta tags e URL otimizados",
                "icon" to "search",
                "category" to "seo"
            ),
            mapOf(
                "code" to "generate_ml",
                "name" to "Adaptar para Mercado Livre",
                "description" to "Otimiza título e descrição para ML",
                "icon" to "shopping-bag",
                "category" to "marketplace"
            ),
            mapOf(
                "code" to "generate_amazon",
                "name" to "Adaptar para Amazon",
                "description" to "Otimiza conteúdo para Amazon",
                "icon" to "shopping-cart",
                "category" to "marketplace"
            ),
            mapOf(
                "code" to "translate",
                "name" to "Traduzir",
                "description" to "Traduz conteúdo para outros idiomas",
                "icon" to "globe",
                "category" to "i18n"
            ),
            mapOf(
                "code" to "enrich",
                "name" to "Enriquecer Dados",
                "description" to "Sugere categorias, tags e atributos",
                "icon" to "sparkles",
                "category" to "enrichment"
            )
        )
        return ResponseEntity.ok(actions)
    }
}
