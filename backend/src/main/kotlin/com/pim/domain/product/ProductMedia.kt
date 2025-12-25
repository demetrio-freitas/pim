package com.pim.domain.product

import jakarta.persistence.*
import org.springframework.data.annotation.CreatedDate
import org.springframework.data.jpa.domain.support.AuditingEntityListener
import java.time.Instant
import java.util.*

@Entity
@Table(name = "product_media")
@EntityListeners(AuditingEntityListener::class)
data class ProductMedia(
    @Id
    val id: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    var product: Product? = null,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var type: MediaType = MediaType.IMAGE,

    @Column(nullable = false)
    var fileName: String,

    @Column(nullable = false)
    var originalName: String,

    @Column(nullable = false)
    var mimeType: String,

    @Column(nullable = false)
    var size: Long,

    @Column(nullable = false)
    var path: String,

    var url: String? = null,

    var alt: String? = null,

    var title: String? = null,

    @Column(nullable = false)
    var position: Int = 0,

    @Column(name = "is_main")
    var isMain: Boolean = false,

    @Column(name = "locale")
    var locale: String? = null,

    @Column(name = "external_url", columnDefinition = "TEXT")
    var externalUrl: String? = null,

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant = Instant.now()
)

enum class MediaType {
    IMAGE,
    VIDEO,
    DOCUMENT,
    AUDIO
}
