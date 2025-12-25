package com.pim.domain.media

import com.pim.domain.product.MediaType
import jakarta.persistence.*
import org.springframework.data.annotation.CreatedDate
import org.springframework.data.annotation.LastModifiedDate
import org.springframework.data.jpa.domain.support.AuditingEntityListener
import java.time.Instant
import java.util.*

@Entity
@Table(name = "media_library")
@EntityListeners(AuditingEntityListener::class)
data class Media(
    @Id
    val id: UUID = UUID.randomUUID(),

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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var type: MediaType = MediaType.IMAGE,

    var alt: String? = null,

    var title: String? = null,

    var description: String? = null,

    @ElementCollection
    @CollectionTable(name = "media_tags", joinColumns = [JoinColumn(name = "media_id")])
    @Column(name = "tag")
    var tags: MutableSet<String> = mutableSetOf(),

    @Column(name = "folder")
    var folder: String? = null,

    var width: Int? = null,

    var height: Int? = null,

    var duration: Int? = null,

    @Column(name = "created_by")
    var createdBy: UUID? = null,

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant = Instant.now(),

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()
) {
    fun getExtension(): String {
        return originalName.substringAfterLast('.', "")
    }

    fun isImage(): Boolean = type == MediaType.IMAGE
    fun isVideo(): Boolean = type == MediaType.VIDEO
    fun isDocument(): Boolean = type == MediaType.DOCUMENT
}
