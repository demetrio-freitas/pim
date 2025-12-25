package com.pim.infrastructure.persistence

import com.pim.domain.mercadolivre.*
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface MercadoLivreAccountRepository : JpaRepository<MercadoLivreAccount, UUID> {

    fun findByMlUserId(mlUserId: String): MercadoLivreAccount?

    fun findByStatus(status: MLAccountStatus): List<MercadoLivreAccount>

    fun findByStatus(status: MLAccountStatus, pageable: Pageable): Page<MercadoLivreAccount>

    @Query("SELECT a FROM MercadoLivreAccount a WHERE a.status = 'ACTIVE' AND a.autoSyncEnabled = true")
    fun findActiveWithAutoSync(): List<MercadoLivreAccount>

    @Query("SELECT a FROM MercadoLivreAccount a WHERE a.status = 'ACTIVE' AND a.tokenExpiresAt < CURRENT_TIMESTAMP")
    fun findWithExpiredTokens(): List<MercadoLivreAccount>

    fun existsByMlUserId(mlUserId: String): Boolean
}

@Repository
interface MLProductMappingRepository : JpaRepository<MLProductMapping, UUID> {

    fun findByAccountId(accountId: UUID): List<MLProductMapping>

    fun findByAccountId(accountId: UUID, pageable: Pageable): Page<MLProductMapping>

    fun findByAccountIdAndProductId(accountId: UUID, productId: UUID): MLProductMapping?

    fun findByAccountIdAndMlItemId(accountId: UUID, mlItemId: String): MLProductMapping?

    fun findByProductId(productId: UUID): List<MLProductMapping>

    fun findByStatus(status: MLMappingStatus): List<MLProductMapping>

    fun findByAccountIdAndStatus(accountId: UUID, status: MLMappingStatus): List<MLProductMapping>

    fun findByAccountIdAndStatus(accountId: UUID, status: MLMappingStatus, pageable: Pageable): Page<MLProductMapping>

    @Query("SELECT m FROM MLProductMapping m WHERE m.accountId = :accountId AND m.status IN :statuses")
    fun findByAccountIdAndStatusIn(
        @Param("accountId") accountId: UUID,
        @Param("statuses") statuses: List<MLMappingStatus>
    ): List<MLProductMapping>

    @Query("SELECT COUNT(m) FROM MLProductMapping m WHERE m.accountId = :accountId")
    fun countByAccountId(@Param("accountId") accountId: UUID): Long

    @Query("SELECT COUNT(m) FROM MLProductMapping m WHERE m.accountId = :accountId AND m.status = :status")
    fun countByAccountIdAndStatus(
        @Param("accountId") accountId: UUID,
        @Param("status") status: MLMappingStatus
    ): Long

    fun deleteByAccountIdAndProductId(accountId: UUID, productId: UUID)

    fun deleteByAccountId(accountId: UUID)

    @Query("""
        SELECT m FROM MLProductMapping m
        WHERE m.accountId = :accountId
        AND (m.status = 'PENDING_SYNC' OR m.status = 'SYNC_ERROR')
        ORDER BY m.updatedAt ASC
    """)
    fun findPendingSyncByAccountId(@Param("accountId") accountId: UUID, pageable: Pageable): Page<MLProductMapping>
}
