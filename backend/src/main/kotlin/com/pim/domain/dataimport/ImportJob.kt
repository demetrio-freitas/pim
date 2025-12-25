package com.pim.domain.dataimport

import jakarta.persistence.*
import java.time.Instant
import java.util.*

@Entity
@Table(name = "import_jobs")
data class ImportJob(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(nullable = false)
    var fileName: String,

    @Column(nullable = false)
    var originalName: String,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var type: ImportType = ImportType.PRODUCTS,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: ImportStatus = ImportStatus.PENDING,

    @Column(name = "total_rows")
    var totalRows: Int = 0,

    @Column(name = "processed_rows")
    var processedRows: Int = 0,

    @Column(name = "success_count")
    var successCount: Int = 0,

    @Column(name = "error_count")
    var errorCount: Int = 0,

    @Column(name = "skip_count")
    var skipCount: Int = 0,

    @Column(columnDefinition = "TEXT")
    var errors: String? = null,

    @Column(name = "user_id")
    var userId: UUID? = null,

    @Column(name = "user_name")
    var userName: String? = null,

    @Column(name = "started_at")
    var startedAt: Instant? = null,

    @Column(name = "completed_at")
    var completedAt: Instant? = null,

    @Column(name = "created_at", nullable = false)
    var createdAt: Instant = Instant.now()
)

enum class ImportType {
    PRODUCTS,
    CATEGORIES,
    ATTRIBUTES
}

enum class ImportStatus {
    PENDING,
    PROCESSING,
    COMPLETED,
    FAILED,
    CANCELLED
}
