package com.pim.domain.ai

import jakarta.persistence.*
import java.time.Instant
import java.util.*

enum class AIProviderType {
    OPENAI,
    ANTHROPIC,
    GOOGLE,
    AZURE_OPENAI
}

@Entity
@Table(name = "ai_providers")
data class AIProvider(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(nullable = false)
    var name: String,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var type: AIProviderType = AIProviderType.OPENAI,

    @Column(nullable = false)
    var apiKey: String,

    @Column
    var apiEndpoint: String? = null,

    @Column
    var defaultModel: String = "gpt-4o-mini",

    @Column
    var maxTokens: Int = 4096,

    @Column
    var temperature: Double = 0.7,

    @Column
    var isActive: Boolean = true,

    @Column
    var isDefault: Boolean = false,

    @Column
    var monthlyBudget: Double? = null,

    @Column
    var currentMonthUsage: Double = 0.0,

    @Column
    var totalTokensUsed: Long = 0,

    @Column
    var totalRequestsCount: Long = 0,

    @Column(nullable = false)
    val createdAt: Instant = Instant.now(),

    @Column
    var updatedAt: Instant = Instant.now()
)

@Entity
@Table(name = "ai_usage_logs")
data class AIUsageLog(
    @Id
    val id: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "provider_id")
    var provider: AIProvider,

    @Column(nullable = false)
    var operation: String,

    @Column
    var model: String,

    @Column
    var inputTokens: Int = 0,

    @Column
    var outputTokens: Int = 0,

    @Column
    var totalTokens: Int = 0,

    @Column
    var estimatedCost: Double = 0.0,

    @Column
    var durationMs: Long = 0,

    @Column
    var success: Boolean = true,

    @Column(columnDefinition = "TEXT")
    var errorMessage: String? = null,

    @Column
    var entityType: String? = null,

    @Column
    var entityId: UUID? = null,

    @Column
    var userId: UUID? = null,

    @Column(nullable = false)
    val createdAt: Instant = Instant.now()
)

@Entity
@Table(name = "ai_prompts")
data class AIPrompt(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(nullable = false, unique = true)
    var code: String,

    @Column(nullable = false)
    var name: String,

    @Column(columnDefinition = "TEXT")
    var description: String? = null,

    @Column(nullable = false)
    var category: String,

    @Column(columnDefinition = "TEXT", nullable = false)
    var systemPrompt: String,

    @Column(columnDefinition = "TEXT", nullable = false)
    var userPromptTemplate: String,

    @Column
    var model: String? = null,

    @Column
    var maxTokens: Int? = null,

    @Column
    var temperature: Double? = null,

    @Column
    var isActive: Boolean = true,

    @Column
    var version: Int = 1,

    @Column(nullable = false)
    val createdAt: Instant = Instant.now(),

    @Column
    var updatedAt: Instant = Instant.now()
)
