package com.pim.application.ai

import com.pim.domain.ai.AIProvider
import com.pim.domain.ai.AIProviderType
import org.springframework.stereotype.Component
import org.springframework.web.client.RestTemplate
import org.springframework.http.*
import com.fasterxml.jackson.annotation.JsonProperty
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.DeserializationFeature

data class AIMessage(
    val role: String,
    val content: String
)

data class AICompletionRequest(
    val messages: List<AIMessage>,
    val model: String,
    val maxTokens: Int = 4096,
    val temperature: Double = 0.7
)

data class AICompletionResponse(
    val content: String,
    val model: String,
    val inputTokens: Int,
    val outputTokens: Int,
    val totalTokens: Int,
    val finishReason: String?
)

// OpenAI Request/Response
data class OpenAIRequest(
    val model: String,
    val messages: List<OpenAIMessage>,
    @JsonProperty("max_tokens")
    val maxTokens: Int,
    val temperature: Double
)

data class OpenAIMessage(
    val role: String,
    val content: String
)

data class OpenAIResponse(
    val id: String? = null,
    val choices: List<OpenAIChoice> = emptyList(),
    val usage: OpenAIUsage? = null
)

data class OpenAIChoice(
    val message: OpenAIMessage? = null,
    @JsonProperty("finish_reason")
    val finishReason: String? = null
)

data class OpenAIUsage(
    @JsonProperty("prompt_tokens")
    val promptTokens: Int = 0,
    @JsonProperty("completion_tokens")
    val completionTokens: Int = 0,
    @JsonProperty("total_tokens")
    val totalTokens: Int = 0
)

// Anthropic Request/Response
data class AnthropicRequest(
    val model: String,
    val messages: List<AnthropicMessage>,
    @JsonProperty("max_tokens")
    val maxTokens: Int,
    val system: String? = null
)

data class AnthropicMessage(
    val role: String,
    val content: String
)

data class AnthropicResponse(
    val id: String? = null,
    val content: List<AnthropicContent> = emptyList(),
    val model: String? = null,
    val usage: AnthropicUsage? = null,
    @JsonProperty("stop_reason")
    val stopReason: String? = null
)

data class AnthropicContent(
    val type: String = "text",
    val text: String = ""
)

data class AnthropicUsage(
    @JsonProperty("input_tokens")
    val inputTokens: Int = 0,
    @JsonProperty("output_tokens")
    val outputTokens: Int = 0
)

interface AIClient {
    fun complete(request: AICompletionRequest): AICompletionResponse
    fun estimateCost(inputTokens: Int, outputTokens: Int, model: String): Double
}

@Component
class OpenAIClient(
    private val objectMapper: ObjectMapper
) : AIClient {

    private val restTemplate = RestTemplate()
    private var apiKey: String = ""
    private var baseUrl: String = "https://api.openai.com/v1"

    fun configure(provider: AIProvider) {
        this.apiKey = provider.apiKey
        this.baseUrl = provider.apiEndpoint ?: "https://api.openai.com/v1"
    }

    override fun complete(request: AICompletionRequest): AICompletionResponse {
        val openAIRequest = OpenAIRequest(
            model = request.model,
            messages = request.messages.map { OpenAIMessage(it.role, it.content) },
            maxTokens = request.maxTokens,
            temperature = request.temperature
        )

        val headers = HttpHeaders().apply {
            contentType = MediaType.APPLICATION_JSON
            setBearerAuth(apiKey)
        }

        val entity = HttpEntity(openAIRequest, headers)

        val response = restTemplate.exchange(
            "$baseUrl/chat/completions",
            HttpMethod.POST,
            entity,
            OpenAIResponse::class.java
        )

        val body = response.body ?: throw RuntimeException("Empty response from OpenAI")

        return AICompletionResponse(
            content = body.choices.firstOrNull()?.message?.content ?: "",
            model = request.model,
            inputTokens = body.usage?.promptTokens ?: 0,
            outputTokens = body.usage?.completionTokens ?: 0,
            totalTokens = body.usage?.totalTokens ?: 0,
            finishReason = body.choices.firstOrNull()?.finishReason
        )
    }

    override fun estimateCost(inputTokens: Int, outputTokens: Int, model: String): Double {
        // Pricing per 1M tokens (as of 2024)
        val (inputPrice, outputPrice) = when {
            model.contains("gpt-4o-mini") -> 0.15 to 0.60
            model.contains("gpt-4o") -> 2.50 to 10.00
            model.contains("gpt-4-turbo") -> 10.00 to 30.00
            model.contains("gpt-4") -> 30.00 to 60.00
            model.contains("gpt-3.5") -> 0.50 to 1.50
            else -> 0.50 to 1.50
        }
        return (inputTokens * inputPrice / 1_000_000) + (outputTokens * outputPrice / 1_000_000)
    }
}

// Azure OpenAI Request/Response (slightly different from OpenAI)
data class AzureOpenAIRequest(
    val messages: List<OpenAIMessage>,
    @JsonProperty("max_tokens")
    val maxTokens: Int,
    val temperature: Double
)

// Google Gemini Request/Response
data class GeminiRequest(
    val contents: List<GeminiContent>,
    val generationConfig: GeminiGenerationConfig? = null
)

data class GeminiContent(
    val parts: List<GeminiPart>,
    val role: String = "user"
)

data class GeminiPart(
    val text: String
)

data class GeminiGenerationConfig(
    val maxOutputTokens: Int = 4096,
    val temperature: Double = 0.7
)

data class GeminiResponse(
    val candidates: List<GeminiCandidate> = emptyList(),
    val usageMetadata: GeminiUsageMetadata? = null
)

data class GeminiCandidate(
    val content: GeminiContent? = null,
    val finishReason: String? = null
)

data class GeminiUsageMetadata(
    val promptTokenCount: Int = 0,
    val candidatesTokenCount: Int = 0,
    val totalTokenCount: Int = 0
)

@Component
class AzureOpenAIClient(
    private val objectMapper: ObjectMapper
) : AIClient {

    private val restTemplate = RestTemplate()
    private var apiKey: String = ""
    private var baseUrl: String = ""
    private var deploymentName: String = ""
    private var apiVersion: String = "2024-02-15-preview"

    fun configure(provider: AIProvider) {
        this.apiKey = provider.apiKey
        // Azure endpoint format: https://{resource-name}.openai.azure.com
        this.baseUrl = provider.apiEndpoint ?: ""
        // Extract deployment name from defaultModel or use it directly
        this.deploymentName = provider.defaultModel
    }

    override fun complete(request: AICompletionRequest): AICompletionResponse {
        val azureRequest = AzureOpenAIRequest(
            messages = request.messages.map { OpenAIMessage(it.role, it.content) },
            maxTokens = request.maxTokens,
            temperature = request.temperature
        )

        val headers = HttpHeaders().apply {
            contentType = MediaType.APPLICATION_JSON
            // Azure uses api-key header instead of Bearer auth
            set("api-key", apiKey)
        }

        val entity = HttpEntity(azureRequest, headers)

        // Azure endpoint format: {base}/openai/deployments/{deployment}/chat/completions?api-version={version}
        val url = "$baseUrl/openai/deployments/$deploymentName/chat/completions?api-version=$apiVersion"

        val response = restTemplate.exchange(
            url,
            HttpMethod.POST,
            entity,
            OpenAIResponse::class.java
        )

        val body = response.body ?: throw RuntimeException("Empty response from Azure OpenAI")

        return AICompletionResponse(
            content = body.choices.firstOrNull()?.message?.content ?: "",
            model = deploymentName,
            inputTokens = body.usage?.promptTokens ?: 0,
            outputTokens = body.usage?.completionTokens ?: 0,
            totalTokens = body.usage?.totalTokens ?: 0,
            finishReason = body.choices.firstOrNull()?.finishReason
        )
    }

    override fun estimateCost(inputTokens: Int, outputTokens: Int, model: String): Double {
        // Azure pricing is similar to OpenAI
        val (inputPrice, outputPrice) = when {
            model.contains("gpt-4o") -> 2.50 to 10.00
            model.contains("gpt-4") -> 30.00 to 60.00
            model.contains("gpt-35") || model.contains("gpt-3.5") -> 0.50 to 1.50
            else -> 2.50 to 10.00
        }
        return (inputTokens * inputPrice / 1_000_000) + (outputTokens * outputPrice / 1_000_000)
    }
}

@Component
class GoogleAIClient(
    private val objectMapper: ObjectMapper
) : AIClient {

    private val restTemplate = RestTemplate()
    private var apiKey: String = ""
    private var model: String = "gemini-1.5-flash"

    fun configure(provider: AIProvider) {
        this.apiKey = provider.apiKey
        this.model = provider.defaultModel
    }

    override fun complete(request: AICompletionRequest): AICompletionResponse {
        // Convert messages to Gemini format
        val contents = request.messages.mapNotNull { msg ->
            if (msg.role == "system") {
                // Gemini handles system prompts differently - prepend to first user message
                null
            } else {
                GeminiContent(
                    parts = listOf(GeminiPart(msg.content)),
                    role = if (msg.role == "assistant") "model" else "user"
                )
            }
        }

        // If there's a system message, prepend it to the first user message
        val systemMessage = request.messages.find { it.role == "system" }?.content
        val finalContents = if (systemMessage != null && contents.isNotEmpty()) {
            val firstContent = contents.first()
            val modifiedFirst = firstContent.copy(
                parts = listOf(GeminiPart("$systemMessage\n\n${firstContent.parts.firstOrNull()?.text ?: ""}"))
            )
            listOf(modifiedFirst) + contents.drop(1)
        } else {
            contents
        }

        val geminiRequest = GeminiRequest(
            contents = finalContents,
            generationConfig = GeminiGenerationConfig(
                maxOutputTokens = request.maxTokens,
                temperature = request.temperature
            )
        )

        val headers = HttpHeaders().apply {
            contentType = MediaType.APPLICATION_JSON
        }

        val entity = HttpEntity(geminiRequest, headers)

        // Gemini API endpoint format
        val url = "https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent?key=$apiKey"

        val response = restTemplate.exchange(
            url,
            HttpMethod.POST,
            entity,
            GeminiResponse::class.java
        )

        val body = response.body ?: throw RuntimeException("Empty response from Google AI")

        val content = body.candidates.firstOrNull()?.content?.parts?.firstOrNull()?.text ?: ""

        return AICompletionResponse(
            content = content,
            model = model,
            inputTokens = body.usageMetadata?.promptTokenCount ?: 0,
            outputTokens = body.usageMetadata?.candidatesTokenCount ?: 0,
            totalTokens = body.usageMetadata?.totalTokenCount ?: 0,
            finishReason = body.candidates.firstOrNull()?.finishReason
        )
    }

    override fun estimateCost(inputTokens: Int, outputTokens: Int, model: String): Double {
        // Gemini pricing per 1M tokens (as of 2024)
        val (inputPrice, outputPrice) = when {
            model.contains("gemini-1.5-pro") -> 1.25 to 5.00
            model.contains("gemini-1.5-flash") -> 0.075 to 0.30
            model.contains("gemini-1.0-pro") || model.contains("gemini-pro") -> 0.50 to 1.50
            else -> 0.50 to 1.50
        }
        return (inputTokens * inputPrice / 1_000_000) + (outputTokens * outputPrice / 1_000_000)
    }
}

@Component
class AnthropicClient(
    private val objectMapper: ObjectMapper
) : AIClient {

    private val restTemplate = RestTemplate()
    private var apiKey: String = ""
    private var baseUrl: String = "https://api.anthropic.com/v1"

    fun configure(provider: AIProvider) {
        this.apiKey = provider.apiKey
        this.baseUrl = provider.apiEndpoint ?: "https://api.anthropic.com/v1"
    }

    override fun complete(request: AICompletionRequest): AICompletionResponse {
        val systemMessage = request.messages.find { it.role == "system" }?.content
        val userMessages = request.messages.filter { it.role != "system" }

        val anthropicRequest = AnthropicRequest(
            model = request.model,
            messages = userMessages.map { AnthropicMessage(it.role, it.content) },
            maxTokens = request.maxTokens,
            system = systemMessage
        )

        val headers = HttpHeaders().apply {
            contentType = MediaType.APPLICATION_JSON
            set("x-api-key", apiKey)
            set("anthropic-version", "2023-06-01")
        }

        val entity = HttpEntity(anthropicRequest, headers)

        val response = restTemplate.exchange(
            "$baseUrl/messages",
            HttpMethod.POST,
            entity,
            AnthropicResponse::class.java
        )

        val body = response.body ?: throw RuntimeException("Empty response from Anthropic")

        return AICompletionResponse(
            content = body.content.firstOrNull()?.text ?: "",
            model = body.model ?: request.model,
            inputTokens = body.usage?.inputTokens ?: 0,
            outputTokens = body.usage?.outputTokens ?: 0,
            totalTokens = (body.usage?.inputTokens ?: 0) + (body.usage?.outputTokens ?: 0),
            finishReason = body.stopReason
        )
    }

    override fun estimateCost(inputTokens: Int, outputTokens: Int, model: String): Double {
        // Pricing per 1M tokens (as of 2024)
        val (inputPrice, outputPrice) = when {
            model.contains("claude-3-5-sonnet") -> 3.00 to 15.00
            model.contains("claude-3-opus") -> 15.00 to 75.00
            model.contains("claude-3-sonnet") -> 3.00 to 15.00
            model.contains("claude-3-haiku") -> 0.25 to 1.25
            else -> 3.00 to 15.00
        }
        return (inputTokens * inputPrice / 1_000_000) + (outputTokens * outputPrice / 1_000_000)
    }
}

@Component
class AIClientFactory(
    private val openAIClient: OpenAIClient,
    private val anthropicClient: AnthropicClient,
    private val azureOpenAIClient: AzureOpenAIClient,
    private val googleAIClient: GoogleAIClient
) {
    fun getClient(provider: AIProvider): AIClient {
        return when (provider.type) {
            AIProviderType.OPENAI -> {
                openAIClient.configure(provider)
                openAIClient
            }
            AIProviderType.AZURE_OPENAI -> {
                azureOpenAIClient.configure(provider)
                azureOpenAIClient
            }
            AIProviderType.ANTHROPIC -> {
                anthropicClient.configure(provider)
                anthropicClient
            }
            AIProviderType.GOOGLE -> {
                googleAIClient.configure(provider)
                googleAIClient
            }
        }
    }
}
