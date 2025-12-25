package com.pim.infrastructure.persistence

import com.pim.domain.integration.*
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.*

@Repository
interface ApiKeyRepository : JpaRepository<ApiKey, UUID> {
    fun findByKeyHash(keyHash: String): ApiKey?
    fun findByKeyPrefix(keyPrefix: String): ApiKey?
    fun findByStatus(status: ApiKeyStatus): List<ApiKey>
    fun findByCreatedBy(userId: UUID): List<ApiKey>
    fun findAllByOrderByCreatedAtDesc(pageable: Pageable): Page<ApiKey>

    @Query("SELECT a FROM ApiKey a WHERE a.status = 'ACTIVE' AND (a.expiresAt IS NULL OR a.expiresAt > :now)")
    fun findAllActive(@Param("now") now: Instant): List<ApiKey>
}

@Repository
interface WebhookRepository : JpaRepository<Webhook, UUID> {
    fun findByStatus(status: WebhookStatus): List<Webhook>
    fun findByCreatedBy(userId: UUID): List<Webhook>
    fun findAllByOrderByCreatedAtDesc(pageable: Pageable): Page<Webhook>

    @Query("SELECT w FROM Webhook w WHERE w.status = 'ACTIVE' AND :event MEMBER OF w.events")
    fun findActiveByEvent(@Param("event") event: WebhookEvent): List<Webhook>

    @Query("SELECT w FROM Webhook w JOIN w.events e WHERE w.status = 'ACTIVE' AND e = :event")
    fun findByEventAndStatusActive(@Param("event") event: WebhookEvent): List<Webhook>
}

@Repository
interface WebhookLogRepository : JpaRepository<WebhookLog, UUID> {
    fun findByWebhookIdOrderByCreatedAtDesc(webhookId: UUID, pageable: Pageable): Page<WebhookLog>
    fun findByEventOrderByCreatedAtDesc(event: WebhookEvent, pageable: Pageable): Page<WebhookLog>

    @Query("SELECT COUNT(l) FROM WebhookLog l WHERE l.webhookId = :webhookId AND l.success = true")
    fun countSuccessByWebhookId(@Param("webhookId") webhookId: UUID): Long

    @Query("SELECT COUNT(l) FROM WebhookLog l WHERE l.webhookId = :webhookId AND l.success = false")
    fun countFailuresByWebhookId(@Param("webhookId") webhookId: UUID): Long

    @Query("SELECT l FROM WebhookLog l WHERE l.createdAt > :since ORDER BY l.createdAt DESC")
    fun findRecentLogs(@Param("since") since: Instant, pageable: Pageable): Page<WebhookLog>
}
