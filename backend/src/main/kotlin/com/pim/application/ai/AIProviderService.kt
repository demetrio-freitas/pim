package com.pim.application.ai

import com.pim.domain.ai.*
import com.pim.infrastructure.persistence.*
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.time.YearMonth
import java.time.ZoneOffset
import java.util.*

data class AIProviderCreateRequest(
    val name: String,
    val type: AIProviderType,
    val apiKey: String,
    val apiEndpoint: String? = null,
    val defaultModel: String? = null,
    val maxTokens: Int? = null,
    val temperature: Double? = null,
    val monthlyBudget: Double? = null,
    val isDefault: Boolean = false
)

data class AIProviderUpdateRequest(
    val name: String? = null,
    val apiKey: String? = null,
    val apiEndpoint: String? = null,
    val defaultModel: String? = null,
    val maxTokens: Int? = null,
    val temperature: Double? = null,
    val monthlyBudget: Double? = null,
    val isActive: Boolean? = null,
    val isDefault: Boolean? = null
)

data class AIProviderResponse(
    val id: UUID,
    val name: String,
    val type: AIProviderType,
    val apiEndpoint: String?,
    val defaultModel: String,
    val maxTokens: Int,
    val temperature: Double,
    val isActive: Boolean,
    val isDefault: Boolean,
    val monthlyBudget: Double?,
    val currentMonthUsage: Double,
    val totalTokensUsed: Long,
    val totalRequestsCount: Long,
    val createdAt: Instant,
    val updatedAt: Instant
)

data class AIUsageStatsResponse(
    val totalRequests: Long,
    val totalTokens: Long,
    val totalCost: Double,
    val operationStats: List<OperationStat>,
    val dailyStats: List<DailyStat>
)

data class OperationStat(
    val operation: String,
    val count: Long,
    val tokens: Long,
    val cost: Double
)

data class DailyStat(
    val date: String,
    val requests: Long,
    val tokens: Long,
    val cost: Double
)

data class AIPromptCreateRequest(
    val code: String,
    val name: String,
    val description: String? = null,
    val category: String,
    val systemPrompt: String,
    val userPromptTemplate: String,
    val model: String? = null,
    val maxTokens: Int? = null,
    val temperature: Double? = null
)

data class AIPromptResponse(
    val id: UUID,
    val code: String,
    val name: String,
    val description: String?,
    val category: String,
    val systemPrompt: String,
    val userPromptTemplate: String,
    val model: String?,
    val maxTokens: Int?,
    val temperature: Double?,
    val isActive: Boolean,
    val version: Int,
    val createdAt: Instant,
    val updatedAt: Instant
)

@Service
class AIProviderService(
    private val providerRepository: AIProviderRepository,
    private val usageLogRepository: AIUsageLogRepository,
    private val promptRepository: AIPromptRepository,
    private val clientFactory: AIClientFactory
) {

    // Provider CRUD
    @Transactional
    fun createProvider(request: AIProviderCreateRequest): AIProviderResponse {
        if (providerRepository.existsByName(request.name)) {
            throw IllegalArgumentException("Já existe um provedor com este nome")
        }

        if (request.isDefault) {
            clearDefaultProvider()
        }

        val provider = AIProvider(
            name = request.name,
            type = request.type,
            apiKey = request.apiKey,
            apiEndpoint = request.apiEndpoint,
            defaultModel = request.defaultModel ?: getDefaultModel(request.type),
            maxTokens = request.maxTokens ?: 4096,
            temperature = request.temperature ?: 0.7,
            monthlyBudget = request.monthlyBudget,
            isDefault = request.isDefault
        )

        return providerRepository.save(provider).toResponse()
    }

    fun getProvider(id: UUID): AIProviderResponse? {
        return providerRepository.findById(id).orElse(null)?.toResponse()
    }

    fun getAllProviders(pageable: Pageable): Page<AIProviderResponse> {
        return providerRepository.findAll(pageable).map { it.toResponse() }
    }

    fun getActiveProviders(): List<AIProviderResponse> {
        return providerRepository.findByIsActiveTrue().map { it.toResponse() }
    }

    @Transactional
    fun updateProvider(id: UUID, request: AIProviderUpdateRequest): AIProviderResponse {
        val provider = providerRepository.findById(id)
            .orElseThrow { IllegalArgumentException("Provedor não encontrado") }

        request.name?.let { provider.name = it }
        request.apiKey?.let { provider.apiKey = it }
        request.apiEndpoint?.let { provider.apiEndpoint = it }
        request.defaultModel?.let { provider.defaultModel = it }
        request.maxTokens?.let { provider.maxTokens = it }
        request.temperature?.let { provider.temperature = it }
        request.monthlyBudget?.let { provider.monthlyBudget = it }
        request.isActive?.let { provider.isActive = it }

        if (request.isDefault == true && !provider.isDefault) {
            clearDefaultProvider()
            provider.isDefault = true
        } else if (request.isDefault == false) {
            provider.isDefault = false
        }

        provider.updatedAt = Instant.now()
        return providerRepository.save(provider).toResponse()
    }

    @Transactional
    fun deleteProvider(id: UUID) {
        val provider = providerRepository.findById(id)
            .orElseThrow { IllegalArgumentException("Provedor não encontrado") }

        if (provider.isDefault) {
            throw IllegalArgumentException("Não é possível excluir o provedor padrão")
        }

        providerRepository.delete(provider)
    }

    @Transactional
    fun testConnection(id: UUID): Map<String, Any> {
        val provider = providerRepository.findById(id)
            .orElseThrow { IllegalArgumentException("Provedor não encontrado") }

        return try {
            val client = clientFactory.getClient(provider)
            val startTime = System.currentTimeMillis()

            val response = client.complete(
                AICompletionRequest(
                    messages = listOf(
                        AIMessage("user", "Responda apenas 'OK' para confirmar que a conexão está funcionando.")
                    ),
                    model = provider.defaultModel,
                    maxTokens = 10,
                    temperature = 0.0
                )
            )

            val duration = System.currentTimeMillis() - startTime

            mapOf(
                "success" to true,
                "message" to "Conexão bem sucedida",
                "responseTime" to duration,
                "model" to provider.defaultModel,
                "response" to response.content
            )
        } catch (e: Exception) {
            mapOf(
                "success" to false,
                "message" to "Falha na conexão: ${e.message}",
                "error" to (e.message ?: "Erro desconhecido")
            )
        }
    }

    // Usage stats
    fun getUsageStats(days: Int = 30): AIUsageStatsResponse {
        val startDate = Instant.now().minus(java.time.Duration.ofDays(days.toLong()))

        val operationStats = usageLogRepository.getUsageStatsByOperation(startDate).map { row ->
            OperationStat(
                operation = row[0] as String,
                count = row[1] as Long,
                tokens = (row[2] as? Long) ?: 0L,
                cost = (row[3] as? Double) ?: 0.0
            )
        }

        val totalRequests = usageLogRepository.countRequestsSince(startDate)
        val totalTokens = operationStats.sumOf { it.tokens }
        val totalCost = operationStats.sumOf { it.cost }

        // Fetch daily usage statistics
        val dailyStats = usageLogRepository.getDailyUsageStats(startDate).map { row ->
            DailyStat(
                date = row[0].toString(), // Date formatted as string
                requests = row[1] as Long,
                tokens = (row[2] as? Long) ?: 0L,
                cost = (row[3] as? Double) ?: 0.0
            )
        }

        return AIUsageStatsResponse(
            totalRequests = totalRequests,
            totalTokens = totalTokens,
            totalCost = totalCost,
            operationStats = operationStats,
            dailyStats = dailyStats
        )
    }

    fun getProviderUsage(providerId: UUID, pageable: Pageable): Page<AIUsageLog> {
        return usageLogRepository.findByProviderId(providerId, pageable)
    }

    // Prompts
    @Transactional
    fun createPrompt(request: AIPromptCreateRequest): AIPromptResponse {
        if (promptRepository.existsByCode(request.code)) {
            throw IllegalArgumentException("Já existe um prompt com este código")
        }

        val prompt = AIPrompt(
            code = request.code,
            name = request.name,
            description = request.description,
            category = request.category,
            systemPrompt = request.systemPrompt,
            userPromptTemplate = request.userPromptTemplate,
            model = request.model,
            maxTokens = request.maxTokens,
            temperature = request.temperature
        )

        return promptRepository.save(prompt).toResponse()
    }

    fun getPrompt(code: String): AIPromptResponse? {
        return promptRepository.findByCode(code)?.toResponse()
    }

    fun getPromptsByCategory(category: String): List<AIPromptResponse> {
        return promptRepository.findByCategoryAndIsActiveTrue(category).map { it.toResponse() }
    }

    fun getAllPrompts(): List<AIPromptResponse> {
        return promptRepository.findAll().map { it.toResponse() }
    }

    @Transactional
    fun updatePrompt(id: UUID, request: AIPromptCreateRequest): AIPromptResponse {
        val prompt = promptRepository.findById(id)
            .orElseThrow { IllegalArgumentException("Prompt não encontrado") }

        prompt.name = request.name
        prompt.description = request.description
        prompt.category = request.category
        prompt.systemPrompt = request.systemPrompt
        prompt.userPromptTemplate = request.userPromptTemplate
        prompt.model = request.model
        prompt.maxTokens = request.maxTokens
        prompt.temperature = request.temperature
        prompt.version++
        prompt.updatedAt = Instant.now()

        return promptRepository.save(prompt).toResponse()
    }

    @Transactional
    fun deletePrompt(id: UUID) {
        promptRepository.deleteById(id)
    }

    @Transactional
    fun initializeDefaultPrompts() {
        val defaultPrompts = listOf(
            AIPrompt(
                code = "product_description",
                name = "Descrição de Produto",
                category = "content",
                systemPrompt = "Você é um especialista em copywriting para e-commerce...",
                userPromptTemplate = "Gere descrições para: {{productName}}"
            ),
            AIPrompt(
                code = "seo_optimization",
                name = "Otimização SEO",
                category = "seo",
                systemPrompt = "Você é um especialista em SEO...",
                userPromptTemplate = "Otimize SEO para: {{productName}}"
            ),
            AIPrompt(
                code = "marketplace_ml",
                name = "Mercado Livre",
                category = "marketplace",
                systemPrompt = "Você é especialista em Mercado Livre...",
                userPromptTemplate = "Adapte para ML: {{productName}}"
            ),
            AIPrompt(
                code = "marketplace_amazon",
                name = "Amazon",
                category = "marketplace",
                systemPrompt = "Você é especialista em Amazon...",
                userPromptTemplate = "Adapte para Amazon: {{productName}}"
            )
        )

        defaultPrompts.forEach { prompt ->
            if (!promptRepository.existsByCode(prompt.code)) {
                promptRepository.save(prompt)
            }
        }
    }

    // Helpers
    private fun clearDefaultProvider() {
        providerRepository.findByIsDefaultTrue()?.let { current ->
            current.isDefault = false
            providerRepository.save(current)
        }
    }

    private fun getDefaultModel(type: AIProviderType): String {
        return when (type) {
            AIProviderType.OPENAI -> "gpt-4o-mini"
            AIProviderType.AZURE_OPENAI -> "gpt-4o-mini"
            AIProviderType.ANTHROPIC -> "claude-3-5-sonnet-20241022"
            AIProviderType.GOOGLE -> "gemini-1.5-flash" // Fixed: gemini-pro is deprecated
        }
    }

    private fun AIProvider.toResponse() = AIProviderResponse(
        id = id,
        name = name,
        type = type,
        apiEndpoint = apiEndpoint,
        defaultModel = defaultModel,
        maxTokens = maxTokens,
        temperature = temperature,
        isActive = isActive,
        isDefault = isDefault,
        monthlyBudget = monthlyBudget,
        currentMonthUsage = currentMonthUsage,
        totalTokensUsed = totalTokensUsed,
        totalRequestsCount = totalRequestsCount,
        createdAt = createdAt,
        updatedAt = updatedAt
    )

    private fun AIPrompt.toResponse() = AIPromptResponse(
        id = id,
        code = code,
        name = name,
        description = description,
        category = category,
        systemPrompt = systemPrompt,
        userPromptTemplate = userPromptTemplate,
        model = model,
        maxTokens = maxTokens,
        temperature = temperature,
        isActive = isActive,
        version = version,
        createdAt = createdAt,
        updatedAt = updatedAt
    )
}
