package com.pim.application.ai

import com.pim.domain.ai.*
import com.pim.domain.product.Product
import com.pim.infrastructure.persistence.*
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.*

data class GenerateDescriptionRequest(
    val productId: UUID? = null,
    val productName: String,
    val productSku: String? = null,
    val brand: String? = null,
    val category: String? = null,
    val attributes: Map<String, String>? = null,
    val keywords: List<String>? = null,
    val tone: String = "professional",
    val length: String = "medium",
    val includeFeatures: Boolean = true,
    val includeBenefits: Boolean = true,
    val targetAudience: String? = null,
    val language: String = "pt-BR"
)

data class GenerateSEORequest(
    val productId: UUID? = null,
    val productName: String,
    val description: String? = null,
    val brand: String? = null,
    val category: String? = null,
    val keywords: List<String>? = null,
    val language: String = "pt-BR"
)

data class GenerateMarketplaceContentRequest(
    val productId: UUID? = null,
    val productName: String,
    val description: String? = null,
    val brand: String? = null,
    val category: String? = null,
    val price: Double? = null,
    val marketplace: String,
    val language: String = "pt-BR"
)

data class TranslateContentRequest(
    val productId: UUID? = null,
    val content: Map<String, String>,
    val sourceLanguage: String = "pt-BR",
    val targetLanguage: String
)

data class EnrichProductRequest(
    val productId: UUID? = null,
    val productName: String,
    val description: String? = null,
    val brand: String? = null,
    val existingAttributes: Map<String, String>? = null
)

data class GeneratedDescription(
    val shortDescription: String,
    val fullDescription: String,
    val bulletPoints: List<String>,
    val features: List<String>?,
    val benefits: List<String>?
)

data class GeneratedSEO(
    val metaTitle: String,
    val metaDescription: String,
    val urlKey: String,
    val keywords: List<String>,
    val h1Suggestion: String?,
    val altTextSuggestion: String?
)

data class GeneratedMarketplaceContent(
    val title: String,
    val description: String,
    val bulletPoints: List<String>,
    val searchTerms: List<String>,
    val attributes: Map<String, String>?
)

data class TranslatedContent(
    val translations: Map<String, String>,
    val sourceLanguage: String,
    val targetLanguage: String
)

data class EnrichedProduct(
    val suggestedCategory: String?,
    val suggestedBrand: String?,
    val extractedAttributes: Map<String, String>,
    val suggestedTags: List<String>,
    val qualityScore: Int,
    val suggestions: List<String>
)

data class AIOperationResult<T>(
    val success: Boolean,
    val data: T?,
    val error: String?,
    val tokensUsed: Int,
    val estimatedCost: Double,
    val durationMs: Long
)

@Service
class AIContentService(
    private val providerRepository: AIProviderRepository,
    private val promptRepository: AIPromptRepository,
    private val usageLogRepository: AIUsageLogRepository,
    private val productRepository: ProductRepository,
    private val clientFactory: AIClientFactory
) {

    @Transactional
    fun generateDescription(
        request: GenerateDescriptionRequest,
        userId: UUID? = null
    ): AIOperationResult<GeneratedDescription> {
        val startTime = System.currentTimeMillis()

        val provider = getActiveProvider()
            ?: return AIOperationResult(false, null, "Nenhum provedor de IA configurado", 0, 0.0, 0)

        val prompt = buildDescriptionPrompt(request)

        return try {
            val client = clientFactory.getClient(provider)
            val response = client.complete(
                AICompletionRequest(
                    messages = listOf(
                        AIMessage("system", getDescriptionSystemPrompt(request.language)),
                        AIMessage("user", prompt)
                    ),
                    model = provider.defaultModel,
                    maxTokens = provider.maxTokens,
                    temperature = provider.temperature
                )
            )

            val result = parseDescriptionResponse(response.content)
            val cost = client.estimateCost(response.inputTokens, response.outputTokens, response.model)
            val duration = System.currentTimeMillis() - startTime

            logUsage(provider, "generate_description", response, cost, duration, true, null,
                "Product", request.productId, userId)

            AIOperationResult(true, result, null, response.totalTokens, cost, duration)
        } catch (e: Exception) {
            val duration = System.currentTimeMillis() - startTime
            logUsage(provider, "generate_description", null, 0.0, duration, false, e.message,
                "Product", request.productId, userId)
            AIOperationResult(false, null, e.message, 0, 0.0, duration)
        }
    }

    @Transactional
    fun generateSEO(
        request: GenerateSEORequest,
        userId: UUID? = null
    ): AIOperationResult<GeneratedSEO> {
        val startTime = System.currentTimeMillis()

        val provider = getActiveProvider()
            ?: return AIOperationResult(false, null, "Nenhum provedor de IA configurado", 0, 0.0, 0)

        val prompt = buildSEOPrompt(request)

        return try {
            val client = clientFactory.getClient(provider)
            val response = client.complete(
                AICompletionRequest(
                    messages = listOf(
                        AIMessage("system", getSEOSystemPrompt(request.language)),
                        AIMessage("user", prompt)
                    ),
                    model = provider.defaultModel,
                    maxTokens = 2048,
                    temperature = 0.5
                )
            )
            val result = parseSEOResponse(response.content)
            val cost = client.estimateCost(response.inputTokens, response.outputTokens, response.model)
            val duration = System.currentTimeMillis() - startTime

            logUsage(provider, "generate_seo", response, cost, duration, true, null,
                "Product", request.productId, userId)

            AIOperationResult(true, result, null, response.totalTokens, cost, duration)
        } catch (e: Exception) {
            val duration = System.currentTimeMillis() - startTime
            logUsage(provider, "generate_seo", null, 0.0, duration, false, e.message,
                "Product", request.productId, userId)
            AIOperationResult(false, null, e.message, 0, 0.0, duration)
        }
    }

    @Transactional
    fun generateMarketplaceContent(
        request: GenerateMarketplaceContentRequest,
        userId: UUID? = null
    ): AIOperationResult<GeneratedMarketplaceContent> {
        val startTime = System.currentTimeMillis()

        val provider = getActiveProvider()
            ?: return AIOperationResult(false, null, "Nenhum provedor de IA configurado", 0, 0.0, 0)

        val prompt = buildMarketplacePrompt(request)

        return try {
            val client = clientFactory.getClient(provider)
            val response = client.complete(
                AICompletionRequest(
                    messages = listOf(
                        AIMessage("system", getMarketplaceSystemPrompt(request.marketplace, request.language)),
                        AIMessage("user", prompt)
                    ),
                    model = provider.defaultModel,
                    maxTokens = 2048,
                    temperature = 0.6
                )
            )
            val result = parseMarketplaceResponse(response.content, request.marketplace)
            val cost = client.estimateCost(response.inputTokens, response.outputTokens, response.model)
            val duration = System.currentTimeMillis() - startTime

            logUsage(provider, "generate_marketplace_${request.marketplace}", response, cost, duration, true, null,
                "Product", request.productId, userId)

            AIOperationResult(true, result, null, response.totalTokens, cost, duration)
        } catch (e: Exception) {
            val duration = System.currentTimeMillis() - startTime
            logUsage(provider, "generate_marketplace_${request.marketplace}", null, 0.0, duration, false, e.message,
                "Product", request.productId, userId)
            AIOperationResult(false, null, e.message, 0, 0.0, duration)
        }
    }

    @Transactional
    fun translateContent(
        request: TranslateContentRequest,
        userId: UUID? = null
    ): AIOperationResult<TranslatedContent> {
        val startTime = System.currentTimeMillis()

        val provider = getActiveProvider()
            ?: return AIOperationResult(false, null, "Nenhum provedor de IA configurado", 0, 0.0, 0)

        val prompt = buildTranslationPrompt(request)

        return try {
            val client = clientFactory.getClient(provider)
            val response = client.complete(
                AICompletionRequest(
                    messages = listOf(
                        AIMessage("system", getTranslationSystemPrompt(request.sourceLanguage, request.targetLanguage)),
                        AIMessage("user", prompt)
                    ),
                    model = provider.defaultModel,
                    maxTokens = 4096,
                    temperature = 0.3
                )
            )
            val result = parseTranslationResponse(response.content, request.sourceLanguage, request.targetLanguage)
            val cost = client.estimateCost(response.inputTokens, response.outputTokens, response.model)
            val duration = System.currentTimeMillis() - startTime

            logUsage(provider, "translate_content", response, cost, duration, true, null,
                "Product", request.productId, userId)

            AIOperationResult(true, result, null, response.totalTokens, cost, duration)
        } catch (e: Exception) {
            val duration = System.currentTimeMillis() - startTime
            logUsage(provider, "translate_content", null, 0.0, duration, false, e.message,
                "Product", request.productId, userId)
            AIOperationResult(false, null, e.message, 0, 0.0, duration)
        }
    }

    @Transactional
    fun enrichProduct(
        request: EnrichProductRequest,
        userId: UUID? = null
    ): AIOperationResult<EnrichedProduct> {
        val startTime = System.currentTimeMillis()

        val provider = getActiveProvider()
            ?: return AIOperationResult(false, null, "Nenhum provedor de IA configurado", 0, 0.0, 0)

        val prompt = buildEnrichmentPrompt(request)

        return try {
            val client = clientFactory.getClient(provider)
            val response = client.complete(
                AICompletionRequest(
                    messages = listOf(
                        AIMessage("system", getEnrichmentSystemPrompt()),
                        AIMessage("user", prompt)
                    ),
                    model = provider.defaultModel,
                    maxTokens = 2048,
                    temperature = 0.4
                )
            )
            val result = parseEnrichmentResponse(response.content)
            val cost = client.estimateCost(response.inputTokens, response.outputTokens, response.model)
            val duration = System.currentTimeMillis() - startTime

            logUsage(provider, "enrich_product", response, cost, duration, true, null,
                "Product", request.productId, userId)

            AIOperationResult(true, result, null, response.totalTokens, cost, duration)
        } catch (e: Exception) {
            val duration = System.currentTimeMillis() - startTime
            logUsage(provider, "enrich_product", null, 0.0, duration, false, e.message,
                "Product", request.productId, userId)
            AIOperationResult(false, null, e.message, 0, 0.0, duration)
        }
    }

    // Helper methods
    private fun getActiveProvider(): AIProvider? {
        return providerRepository.findByIsDefaultTrue()
            ?: providerRepository.findByIsActiveTrue().firstOrNull()
    }

    private fun logUsage(
        provider: AIProvider,
        operation: String,
        response: AICompletionResponse?,
        cost: Double,
        durationMs: Long,
        success: Boolean,
        errorMessage: String?,
        entityType: String?,
        entityId: UUID?,
        userId: UUID?
    ) {
        val log = AIUsageLog(
            provider = provider,
            operation = operation,
            model = response?.model ?: provider.defaultModel,
            inputTokens = response?.inputTokens ?: 0,
            outputTokens = response?.outputTokens ?: 0,
            totalTokens = response?.totalTokens ?: 0,
            estimatedCost = cost,
            durationMs = durationMs,
            success = success,
            errorMessage = errorMessage,
            entityType = entityType,
            entityId = entityId,
            userId = userId
        )
        usageLogRepository.save(log)

        // Update provider stats
        if (response != null) {
            provider.totalTokensUsed += response.totalTokens
            provider.totalRequestsCount++
            provider.currentMonthUsage += cost
            providerRepository.save(provider)
        }
    }

    // Prompt builders
    private fun buildDescriptionPrompt(request: GenerateDescriptionRequest): String {
        return buildString {
            appendLine("Gere descrições para o seguinte produto:")
            appendLine()
            appendLine("Nome: ${request.productName}")
            request.productSku?.let { appendLine("SKU: $it") }
            request.brand?.let { appendLine("Marca: $it") }
            request.category?.let { appendLine("Categoria: $it") }
            request.attributes?.let { attrs ->
                if (attrs.isNotEmpty()) {
                    appendLine("Atributos:")
                    attrs.forEach { (k, v) -> appendLine("  - $k: $v") }
                }
            }
            request.keywords?.let { keywords ->
                if (keywords.isNotEmpty()) {
                    appendLine("Palavras-chave: ${keywords.joinToString(", ")}")
                }
            }
            appendLine()
            appendLine("Configurações:")
            appendLine("- Tom: ${request.tone}")
            appendLine("- Tamanho: ${request.length}")
            appendLine("- Incluir features: ${request.includeFeatures}")
            appendLine("- Incluir benefícios: ${request.includeBenefits}")
            request.targetAudience?.let { appendLine("- Público-alvo: $it") }
        }
    }

    private fun getDescriptionSystemPrompt(language: String): String {
        val langName = if (language.startsWith("pt")) "português brasileiro" else language
        return """
            Você é um especialista em copywriting e marketing de produtos para e-commerce.
            Sua tarefa é criar descrições de produtos atraentes, informativas e otimizadas para vendas.

            Responda sempre em $langName.

            Retorne a resposta no seguinte formato JSON:
            {
                "shortDescription": "Descrição curta (máximo 160 caracteres)",
                "fullDescription": "Descrição completa e detalhada",
                "bulletPoints": ["ponto 1", "ponto 2", "ponto 3", "ponto 4", "ponto 5"],
                "features": ["característica 1", "característica 2"],
                "benefits": ["benefício 1", "benefício 2"]
            }

            Diretrizes:
            - Use linguagem persuasiva e profissional
            - Destaque os diferenciais do produto
            - Inclua palavras-chave naturalmente
            - Evite repetições
            - Seja objetivo e informativo
        """.trimIndent()
    }

    private fun buildSEOPrompt(request: GenerateSEORequest): String {
        return buildString {
            appendLine("Gere conteúdo SEO para o seguinte produto:")
            appendLine()
            appendLine("Nome: ${request.productName}")
            request.brand?.let { appendLine("Marca: $it") }
            request.category?.let { appendLine("Categoria: $it") }
            request.description?.let { appendLine("Descrição: $it") }
            request.keywords?.let { keywords ->
                if (keywords.isNotEmpty()) {
                    appendLine("Palavras-chave existentes: ${keywords.joinToString(", ")}")
                }
            }
        }
    }

    private fun getSEOSystemPrompt(language: String): String {
        val langName = if (language.startsWith("pt")) "português brasileiro" else language
        return """
            Você é um especialista em SEO para e-commerce.
            Sua tarefa é criar meta tags e conteúdo otimizado para mecanismos de busca.

            Responda sempre em $langName.

            Retorne a resposta no seguinte formato JSON:
            {
                "metaTitle": "Título SEO (máximo 60 caracteres)",
                "metaDescription": "Meta descrição (máximo 160 caracteres)",
                "urlKey": "url-amigavel-do-produto",
                "keywords": ["palavra1", "palavra2", "palavra3", "palavra4", "palavra5"],
                "h1Suggestion": "Sugestão de H1 para a página",
                "altTextSuggestion": "Sugestão de alt text para imagem principal"
            }

            Diretrizes:
            - Meta title deve ser atrativo e incluir a palavra-chave principal
            - Meta description deve ser chamativa e incluir CTA
            - URL deve ser curta, sem acentos e separada por hífens
            - Keywords devem ser relevantes e com bom volume de busca
        """.trimIndent()
    }

    private fun buildMarketplacePrompt(request: GenerateMarketplaceContentRequest): String {
        return buildString {
            appendLine("Adapte o conteúdo para o marketplace ${request.marketplace}:")
            appendLine()
            appendLine("Nome: ${request.productName}")
            request.brand?.let { appendLine("Marca: $it") }
            request.category?.let { appendLine("Categoria: $it") }
            request.price?.let { appendLine("Preço: R$ $it") }
            request.description?.let { appendLine("Descrição: $it") }
        }
    }

    private fun getMarketplaceSystemPrompt(marketplace: String, language: String): String {
        val langName = if (language.startsWith("pt")) "português brasileiro" else language
        val marketplaceRules = when (marketplace.lowercase()) {
            "mercadolivre", "ml" -> """
                Regras do Mercado Livre:
                - Título: máximo 60 caracteres
                - Não usar palavras como "promoção", "desconto", "oferta"
                - Não incluir preço no título
                - Usar palavras-chave relevantes no início
            """.trimIndent()
            "amazon" -> """
                Regras da Amazon:
                - Título: máximo 200 caracteres
                - Formato: Marca + Linha + Material + Tamanho/Cor + Quantidade
                - Bullet points: 5 pontos de até 500 caracteres cada
                - Incluir palavras-chave nos bullet points
            """.trimIndent()
            "shopify" -> """
                Regras do Shopify:
                - Título atrativo e otimizado para SEO
                - Descrição com HTML formatado
                - Tags relevantes para navegação
            """.trimIndent()
            "google_shopping", "google" -> """
                Regras do Google Shopping:
                - Título: máximo 150 caracteres
                - Incluir marca, cor, tamanho quando aplicável
                - Descrição: máximo 5000 caracteres
                - Usar termos de busca populares
            """.trimIndent()
            else -> "Otimize para o marketplace especificado."
        }

        return """
            Você é um especialista em otimização de listings para marketplaces.
            Sua tarefa é criar conteúdo otimizado para $marketplace.

            Responda sempre em $langName.

            $marketplaceRules

            Retorne a resposta no seguinte formato JSON:
            {
                "title": "Título otimizado para o marketplace",
                "description": "Descrição completa otimizada",
                "bulletPoints": ["ponto 1", "ponto 2", "ponto 3", "ponto 4", "ponto 5"],
                "searchTerms": ["termo1", "termo2", "termo3"],
                "attributes": {"atributo1": "valor1", "atributo2": "valor2"}
            }
        """.trimIndent()
    }

    private fun buildTranslationPrompt(request: TranslateContentRequest): String {
        return buildString {
            appendLine("Traduza o seguinte conteúdo de ${request.sourceLanguage} para ${request.targetLanguage}:")
            appendLine()
            request.content.forEach { (field, value) ->
                appendLine("$field: $value")
            }
        }
    }

    private fun getTranslationSystemPrompt(source: String, target: String): String {
        return """
            Você é um tradutor profissional especializado em e-commerce.
            Traduza o conteúdo de $source para $target mantendo o tom e estilo.

            Retorne a resposta no seguinte formato JSON:
            {
                "translations": {
                    "campo1": "tradução1",
                    "campo2": "tradução2"
                }
            }

            Diretrizes:
            - Mantenha a formatação original
            - Adapte expressões idiomáticas
            - Preserve termos técnicos quando apropriado
            - Não traduza nomes de marcas
        """.trimIndent()
    }

    private fun buildEnrichmentPrompt(request: EnrichProductRequest): String {
        return buildString {
            appendLine("Analise e enriqueça os dados do seguinte produto:")
            appendLine()
            appendLine("Nome: ${request.productName}")
            request.brand?.let { appendLine("Marca: $it") }
            request.description?.let { appendLine("Descrição: $it") }
            request.existingAttributes?.let { attrs ->
                if (attrs.isNotEmpty()) {
                    appendLine("Atributos existentes:")
                    attrs.forEach { (k, v) -> appendLine("  - $k: $v") }
                }
            }
        }
    }

    private fun getEnrichmentSystemPrompt(): String {
        return """
            Você é um especialista em dados de produtos e classificação.
            Sua tarefa é analisar produtos e sugerir melhorias nos dados.

            Retorne a resposta no seguinte formato JSON:
            {
                "suggestedCategory": "Categoria sugerida ou null",
                "suggestedBrand": "Marca identificada ou null",
                "extractedAttributes": {
                    "cor": "valor",
                    "material": "valor",
                    "tamanho": "valor"
                },
                "suggestedTags": ["tag1", "tag2", "tag3"],
                "qualityScore": 75,
                "suggestions": [
                    "Sugestão de melhoria 1",
                    "Sugestão de melhoria 2"
                ]
            }

            Extraia atributos como:
            - Cor, Material, Tamanho, Peso
            - Gênero, Faixa etária
            - Características técnicas

            O qualityScore deve ser de 0 a 100 baseado na completude dos dados.
        """.trimIndent()
    }

    // Response parsers
    private fun parseDescriptionResponse(content: String): GeneratedDescription {
        val json = extractJson(content)
        // Simple parsing - in production use Jackson
        return GeneratedDescription(
            shortDescription = extractField(json, "shortDescription") ?: "",
            fullDescription = extractField(json, "fullDescription") ?: "",
            bulletPoints = extractList(json, "bulletPoints"),
            features = extractList(json, "features").takeIf { it.isNotEmpty() },
            benefits = extractList(json, "benefits").takeIf { it.isNotEmpty() }
        )
    }

    private fun parseSEOResponse(content: String): GeneratedSEO {
        val json = extractJson(content)
        return GeneratedSEO(
            metaTitle = extractField(json, "metaTitle") ?: "",
            metaDescription = extractField(json, "metaDescription") ?: "",
            urlKey = extractField(json, "urlKey") ?: "",
            keywords = extractList(json, "keywords"),
            h1Suggestion = extractField(json, "h1Suggestion"),
            altTextSuggestion = extractField(json, "altTextSuggestion")
        )
    }

    private fun parseMarketplaceResponse(content: String, marketplace: String): GeneratedMarketplaceContent {
        val json = extractJson(content)
        return GeneratedMarketplaceContent(
            title = extractField(json, "title") ?: "",
            description = extractField(json, "description") ?: "",
            bulletPoints = extractList(json, "bulletPoints"),
            searchTerms = extractList(json, "searchTerms"),
            attributes = extractMap(json, "attributes").takeIf { it.isNotEmpty() }
        )
    }

    private fun parseTranslationResponse(content: String, source: String, target: String): TranslatedContent {
        val json = extractJson(content)
        return TranslatedContent(
            translations = extractMap(json, "translations"),
            sourceLanguage = source,
            targetLanguage = target
        )
    }

    private fun parseEnrichmentResponse(content: String): EnrichedProduct {
        val json = extractJson(content)
        return EnrichedProduct(
            suggestedCategory = extractField(json, "suggestedCategory"),
            suggestedBrand = extractField(json, "suggestedBrand"),
            extractedAttributes = extractMap(json, "extractedAttributes"),
            suggestedTags = extractList(json, "suggestedTags"),
            qualityScore = extractField(json, "qualityScore")?.toIntOrNull() ?: 0,
            suggestions = extractList(json, "suggestions")
        )
    }

    // JSON helpers
    private fun extractJson(content: String): String {
        val start = content.indexOf("{")
        val end = content.lastIndexOf("}") + 1
        return if (start >= 0 && end > start) content.substring(start, end) else "{}"
    }

    private fun extractField(json: String, field: String): String? {
        val regex = """"$field"\s*:\s*"([^"]*)"""".toRegex()
        return regex.find(json)?.groupValues?.get(1)
    }

    private fun extractList(json: String, field: String): List<String> {
        val regex = """"$field"\s*:\s*\[([^\]]*)\]""".toRegex()
        val match = regex.find(json)?.groupValues?.get(1) ?: return emptyList()
        return """"([^"]*)"""".toRegex().findAll(match).map { it.groupValues[1] }.toList()
    }

    private fun extractMap(json: String, field: String): Map<String, String> {
        val regex = """"$field"\s*:\s*\{([^}]*)\}""".toRegex()
        val match = regex.find(json)?.groupValues?.get(1) ?: return emptyMap()
        val pairs = """"([^"]*)"\s*:\s*"([^"]*)"""".toRegex().findAll(match)
        return pairs.associate { it.groupValues[1] to it.groupValues[2] }
    }
}
