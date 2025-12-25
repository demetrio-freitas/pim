package com.pim.infrastructure.persistence

import com.pim.domain.ai.AIPrompt
import com.pim.domain.ai.AIProvider
import com.pim.domain.ai.AIProviderType
import com.pim.domain.ai.AIUsageLog
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.*

@Repository
interface AIProviderRepository : JpaRepository<AIProvider, UUID> {
    fun findByIsActiveTrue(): List<AIProvider>
    fun findByIsDefaultTrue(): AIProvider?
    fun findByType(type: AIProviderType): List<AIProvider>
    fun findByTypeAndIsActiveTrue(type: AIProviderType): List<AIProvider>
    fun existsByName(name: String): Boolean
}

@Repository
interface AIUsageLogRepository : JpaRepository<AIUsageLog, UUID> {
    fun findByProviderId(providerId: UUID, pageable: Pageable): Page<AIUsageLog>
    fun findByEntityTypeAndEntityId(entityType: String, entityId: UUID, pageable: Pageable): Page<AIUsageLog>
    fun findByUserId(userId: UUID, pageable: Pageable): Page<AIUsageLog>

    @Query("""
        SELECT SUM(u.totalTokens) FROM AIUsageLog u
        WHERE u.provider.id = :providerId
        AND u.createdAt >= :startDate
    """)
    fun sumTokensByProviderSince(providerId: UUID, startDate: Instant): Long?

    @Query("""
        SELECT SUM(u.estimatedCost) FROM AIUsageLog u
        WHERE u.provider.id = :providerId
        AND u.createdAt >= :startDate
    """)
    fun sumCostByProviderSince(providerId: UUID, startDate: Instant): Double?

    @Query("""
        SELECT u.operation, COUNT(u), SUM(u.totalTokens), SUM(u.estimatedCost)
        FROM AIUsageLog u
        WHERE u.createdAt >= :startDate
        GROUP BY u.operation
    """)
    fun getUsageStatsByOperation(startDate: Instant): List<Array<Any>>

    @Query("""
        SELECT COUNT(u) FROM AIUsageLog u
        WHERE u.createdAt >= :startDate
    """)
    fun countRequestsSince(startDate: Instant): Long

    @Query("""
        SELECT
            FUNCTION('DATE', u.createdAt),
            COUNT(u),
            COALESCE(SUM(u.totalTokens), 0),
            COALESCE(SUM(u.estimatedCost), 0.0)
        FROM AIUsageLog u
        WHERE u.createdAt >= :startDate
        GROUP BY FUNCTION('DATE', u.createdAt)
        ORDER BY FUNCTION('DATE', u.createdAt) DESC
    """)
    fun getDailyUsageStats(startDate: Instant): List<Array<Any>>
}

@Repository
interface AIPromptRepository : JpaRepository<AIPrompt, UUID> {
    fun findByCode(code: String): AIPrompt?
    fun findByCategory(category: String): List<AIPrompt>
    fun findByIsActiveTrue(): List<AIPrompt>
    fun findByCategoryAndIsActiveTrue(category: String): List<AIPrompt>
    fun existsByCode(code: String): Boolean
}
