package com.pim.infrastructure.persistence

import com.pim.domain.shopify.*
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.*

@Repository
interface ShopifyStoreRepository : JpaRepository<ShopifyStore, UUID> {
    fun findByShopDomain(shopDomain: String): ShopifyStore?
    fun findByName(name: String): ShopifyStore?
    fun findByStatus(status: ShopifyStoreStatus): List<ShopifyStore>
    fun findByStatusAndAutoSyncEnabled(status: ShopifyStoreStatus, autoSyncEnabled: Boolean): List<ShopifyStore>
    fun existsByShopDomain(shopDomain: String): Boolean
    fun existsByName(name: String): Boolean

    @Query("SELECT s FROM ShopifyStore s WHERE s.status = :status AND s.autoSyncEnabled = true AND (s.lastSyncAt IS NULL OR s.lastSyncAt < :before)")
    fun findStoresDueForSync(status: ShopifyStoreStatus, before: Instant): List<ShopifyStore>
}

@Repository
interface ShopifySyncLogRepository : JpaRepository<ShopifySyncLog, UUID> {
    fun findByStoreId(storeId: UUID, pageable: Pageable): Page<ShopifySyncLog>
    fun findByStoreIdAndStatus(storeId: UUID, status: SyncStatus): List<ShopifySyncLog>
    fun findByStoreIdAndType(storeId: UUID, type: SyncLogType, pageable: Pageable): Page<ShopifySyncLog>
    fun findByStoreIdAndEntityId(storeId: UUID, entityId: UUID): List<ShopifySyncLog>

    @Query("SELECT l FROM ShopifySyncLog l WHERE l.storeId = :storeId ORDER BY l.startedAt DESC")
    fun findLatestByStoreId(storeId: UUID, pageable: Pageable): List<ShopifySyncLog>

    @Query("SELECT l FROM ShopifySyncLog l WHERE l.storeId = :storeId AND l.status = 'IN_PROGRESS'")
    fun findInProgressByStoreId(storeId: UUID): List<ShopifySyncLog>

    @Query("SELECT COUNT(l) FROM ShopifySyncLog l WHERE l.storeId = :storeId AND l.status = :status")
    fun countByStoreIdAndStatus(storeId: UUID, status: SyncStatus): Long

    @Query("SELECT l FROM ShopifySyncLog l WHERE l.storeId = :storeId AND l.startedAt >= :since")
    fun findByStoreIdSince(storeId: UUID, since: Instant): List<ShopifySyncLog>
}

@Repository
interface ShopifyProductMappingRepository : JpaRepository<ShopifyProductMapping, UUID> {
    fun findByStoreIdAndProductId(storeId: UUID, productId: UUID): ShopifyProductMapping?
    fun findByStoreIdAndShopifyProductId(storeId: UUID, shopifyProductId: String): ShopifyProductMapping?
    fun findByStoreId(storeId: UUID, pageable: Pageable): Page<ShopifyProductMapping>
    fun findByProductId(productId: UUID): List<ShopifyProductMapping>
    fun findByStoreIdAndStatus(storeId: UUID, status: MappingStatus): List<ShopifyProductMapping>
    fun existsByStoreIdAndProductId(storeId: UUID, productId: UUID): Boolean
    fun existsByStoreIdAndShopifyProductId(storeId: UUID, shopifyProductId: String): Boolean
    fun deleteByStoreIdAndProductId(storeId: UUID, productId: UUID)
    fun deleteByStoreId(storeId: UUID)

    @Query("SELECT m FROM ShopifyProductMapping m WHERE m.storeId = :storeId AND m.status = :status")
    fun findPendingSync(storeId: UUID, status: MappingStatus = MappingStatus.PENDING_SYNC): List<ShopifyProductMapping>

    @Query("SELECT COUNT(m) FROM ShopifyProductMapping m WHERE m.storeId = :storeId")
    fun countByStoreId(storeId: UUID): Long

    @Query("SELECT COUNT(m) FROM ShopifyProductMapping m WHERE m.storeId = :storeId AND m.status = :status")
    fun countByStoreIdAndStatus(storeId: UUID, status: MappingStatus): Long
}
