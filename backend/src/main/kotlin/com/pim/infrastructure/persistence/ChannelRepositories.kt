package com.pim.infrastructure.persistence

import com.pim.domain.channel.*
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface ChannelRepository : JpaRepository<Channel, UUID> {
    fun findByCode(code: String): Channel?
    fun findByStatus(status: ChannelStatus): List<Channel>
    fun findByType(type: ChannelType): List<Channel>
    fun findAllByOrderByPositionAsc(): List<Channel>
    fun findByStatusOrderByPositionAsc(status: ChannelStatus): List<Channel>
    fun existsByCode(code: String): Boolean

    @Query("SELECT c FROM Channel c WHERE LOWER(c.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(c.code) LIKE LOWER(CONCAT('%', :query, '%'))")
    fun search(@Param("query") query: String, pageable: Pageable): Page<Channel>
}

@Repository
interface ProductChannelRepository : JpaRepository<ProductChannel, UUID> {
    fun findByProductId(productId: UUID): List<ProductChannel>
    fun findByChannelId(channelId: UUID): List<ProductChannel>
    fun findByProductIdAndChannelId(productId: UUID, channelId: UUID): ProductChannel?
    fun findByChannelIdAndPublished(channelId: UUID, published: Boolean): List<ProductChannel>
    fun findByChannelIdAndEnabled(channelId: UUID, enabled: Boolean, pageable: Pageable): Page<ProductChannel>
    fun deleteByProductId(productId: UUID)
    fun deleteByChannelId(channelId: UUID)

    @Query("SELECT pc FROM ProductChannel pc WHERE pc.productId = :productId AND pc.enabled = true")
    fun findEnabledByProductId(@Param("productId") productId: UUID): List<ProductChannel>

    @Query("SELECT pc FROM ProductChannel pc WHERE pc.channelId = :channelId AND pc.published = true")
    fun findPublishedByChannelId(@Param("channelId") channelId: UUID): List<ProductChannel>

    @Query("SELECT COUNT(pc) FROM ProductChannel pc WHERE pc.channelId = :channelId AND pc.enabled = true")
    fun countEnabledByChannelId(@Param("channelId") channelId: UUID): Long

    @Query("SELECT COUNT(pc) FROM ProductChannel pc WHERE pc.channelId = :channelId AND pc.published = true")
    fun countPublishedByChannelId(@Param("channelId") channelId: UUID): Long

    @Query("""
        SELECT pc FROM ProductChannel pc
        WHERE pc.channelId = :channelId
        AND pc.enabled = true
        AND pc.completenessScore < 100
    """)
    fun findIncompleteByChannelId(@Param("channelId") channelId: UUID, pageable: Pageable): Page<ProductChannel>
}

@Repository
interface ChannelPublicationLogRepository : JpaRepository<ChannelPublicationLog, UUID> {
    fun findByProductIdOrderByCreatedAtDesc(productId: UUID, pageable: Pageable): Page<ChannelPublicationLog>
    fun findByChannelIdOrderByCreatedAtDesc(channelId: UUID, pageable: Pageable): Page<ChannelPublicationLog>
    fun findByProductIdAndChannelIdOrderByCreatedAtDesc(productId: UUID, channelId: UUID, pageable: Pageable): Page<ChannelPublicationLog>

    @Query("SELECT COUNT(l) FROM ChannelPublicationLog l WHERE l.channelId = :channelId AND l.success = true")
    fun countSuccessByChannelId(@Param("channelId") channelId: UUID): Long

    @Query("SELECT COUNT(l) FROM ChannelPublicationLog l WHERE l.channelId = :channelId AND l.success = false")
    fun countFailuresByChannelId(@Param("channelId") channelId: UUID): Long
}
