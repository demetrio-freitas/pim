package com.pim.infrastructure.persistence

import com.pim.domain.amazon.*
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface AmazonAccountRepository : JpaRepository<AmazonAccount, UUID> {

    fun findBySellerId(sellerId: String): AmazonAccount?

    fun findByStatus(status: AmazonAccountStatus): List<AmazonAccount>

    fun findByStatus(status: AmazonAccountStatus, pageable: Pageable): Page<AmazonAccount>

    @Query("SELECT a FROM AmazonAccount a WHERE a.status = 'ACTIVE' AND a.autoSyncEnabled = true")
    fun findActiveWithAutoSync(): List<AmazonAccount>

    @Query("SELECT a FROM AmazonAccount a WHERE a.status = 'ACTIVE' AND a.tokenExpiresAt < CURRENT_TIMESTAMP")
    fun findWithExpiredTokens(): List<AmazonAccount>

    fun existsBySellerId(sellerId: String): Boolean

    fun findByMarketplaceId(marketplaceId: String): List<AmazonAccount>
}

@Repository
interface AmazonProductMappingRepository : JpaRepository<AmazonProductMapping, UUID> {

    fun findByAccountId(accountId: UUID): List<AmazonProductMapping>

    fun findByAccountId(accountId: UUID, pageable: Pageable): Page<AmazonProductMapping>

    fun findByAccountIdAndProductId(accountId: UUID, productId: UUID): AmazonProductMapping?

    fun findByAccountIdAndAmazonSku(accountId: UUID, amazonSku: String): AmazonProductMapping?

    fun findByAccountIdAndAmazonAsin(accountId: UUID, amazonAsin: String): AmazonProductMapping?

    fun findByProductId(productId: UUID): List<AmazonProductMapping>

    fun findByStatus(status: AmazonMappingStatus): List<AmazonProductMapping>

    fun findByAccountIdAndStatus(accountId: UUID, status: AmazonMappingStatus): List<AmazonProductMapping>

    fun findByAccountIdAndStatus(accountId: UUID, status: AmazonMappingStatus, pageable: Pageable): Page<AmazonProductMapping>

    @Query("SELECT m FROM AmazonProductMapping m WHERE m.accountId = :accountId AND m.status IN :statuses")
    fun findByAccountIdAndStatusIn(
        @Param("accountId") accountId: UUID,
        @Param("statuses") statuses: List<AmazonMappingStatus>
    ): List<AmazonProductMapping>

    @Query("SELECT COUNT(m) FROM AmazonProductMapping m WHERE m.accountId = :accountId")
    fun countByAccountId(@Param("accountId") accountId: UUID): Long

    @Query("SELECT COUNT(m) FROM AmazonProductMapping m WHERE m.accountId = :accountId AND m.status = :status")
    fun countByAccountIdAndStatus(
        @Param("accountId") accountId: UUID,
        @Param("status") status: AmazonMappingStatus
    ): Long

    @Query("SELECT COUNT(m) FROM AmazonProductMapping m WHERE m.accountId = :accountId AND m.hasBuyBox = true")
    fun countWithBuyBox(@Param("accountId") accountId: UUID): Long

    fun deleteByAccountIdAndProductId(accountId: UUID, productId: UUID)

    fun deleteByAccountId(accountId: UUID)

    @Query("""
        SELECT m FROM AmazonProductMapping m
        WHERE m.accountId = :accountId
        AND (m.status = 'PENDING_SYNC' OR m.status = 'SYNC_ERROR')
        ORDER BY m.updatedAt ASC
    """)
    fun findPendingSyncByAccountId(@Param("accountId") accountId: UUID, pageable: Pageable): Page<AmazonProductMapping>

    @Query("""
        SELECT m FROM AmazonProductMapping m
        WHERE m.accountId = :accountId
        AND m.status = 'SUPPRESSED'
    """)
    fun findSuppressedByAccountId(@Param("accountId") accountId: UUID): List<AmazonProductMapping>

    @Query("""
        SELECT m FROM AmazonProductMapping m
        WHERE m.accountId = :accountId
        AND m.fulfillmentChannel = :channel
    """)
    fun findByAccountIdAndFulfillmentChannel(
        @Param("accountId") accountId: UUID,
        @Param("channel") channel: AmazonFulfillmentChannel
    ): List<AmazonProductMapping>
}
