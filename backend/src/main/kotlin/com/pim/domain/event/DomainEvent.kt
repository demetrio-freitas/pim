package com.pim.domain.event

import java.time.Instant
import java.util.*

/**
 * Base interface for all domain events.
 * Domain events represent something that happened in the domain.
 */
interface DomainEvent {
    val eventId: UUID
    val occurredAt: Instant
    val aggregateId: UUID
    val aggregateType: String
    val eventType: String
    val version: Int

    fun toEventData(): Map<String, Any?>
}

/**
 * Abstract base class for domain events with common properties.
 */
abstract class BaseDomainEvent(
    override val aggregateId: UUID,
    override val aggregateType: String
) : DomainEvent {
    override val eventId: UUID = UUID.randomUUID()
    override val occurredAt: Instant = Instant.now()
    override val version: Int = 1
}

// ============================================
// Product Events
// ============================================

sealed class ProductEvent(
    productId: UUID
) : BaseDomainEvent(productId, "Product")

class ProductCreatedEvent(
    productId: UUID,
    val sku: String,
    val name: String,
    val type: String,
    val createdBy: UUID?
) : ProductEvent(productId) {
    override val eventType = "ProductCreated"

    override fun toEventData(): Map<String, Any?> = mapOf(
        "productId" to aggregateId.toString(),
        "sku" to sku,
        "name" to name,
        "type" to type,
        "createdBy" to createdBy?.toString()
    )
}

class ProductUpdatedEvent(
    productId: UUID,
    val changes: Map<String, Any?>,
    val updatedBy: UUID?
) : ProductEvent(productId) {
    override val eventType = "ProductUpdated"

    override fun toEventData(): Map<String, Any?> = mapOf(
        "productId" to aggregateId.toString(),
        "changes" to changes,
        "updatedBy" to updatedBy?.toString()
    )
}

class ProductStatusChangedEvent(
    productId: UUID,
    val previousStatus: String,
    val newStatus: String,
    val changedBy: UUID?
) : ProductEvent(productId) {
    override val eventType = "ProductStatusChanged"

    override fun toEventData(): Map<String, Any?> = mapOf(
        "productId" to aggregateId.toString(),
        "previousStatus" to previousStatus,
        "newStatus" to newStatus,
        "changedBy" to changedBy?.toString()
    )
}

class ProductDeletedEvent(
    productId: UUID,
    val sku: String,
    val deletedBy: UUID?
) : ProductEvent(productId) {
    override val eventType = "ProductDeleted"

    override fun toEventData(): Map<String, Any?> = mapOf(
        "productId" to aggregateId.toString(),
        "sku" to sku,
        "deletedBy" to deletedBy?.toString()
    )
}

class ProductPublishedEvent(
    productId: UUID,
    val channelId: UUID,
    val channelCode: String
) : ProductEvent(productId) {
    override val eventType = "ProductPublished"

    override fun toEventData(): Map<String, Any?> = mapOf(
        "productId" to aggregateId.toString(),
        "channelId" to channelId.toString(),
        "channelCode" to channelCode
    )
}

class ProductAttributeChangedEvent(
    productId: UUID,
    val attributeCode: String,
    val previousValue: Any?,
    val newValue: Any?
) : ProductEvent(productId) {
    override val eventType = "ProductAttributeChanged"

    override fun toEventData(): Map<String, Any?> = mapOf(
        "productId" to aggregateId.toString(),
        "attributeCode" to attributeCode,
        "previousValue" to previousValue?.toString(),
        "newValue" to newValue?.toString()
    )
}

// ============================================
// Category Events
// ============================================

sealed class CategoryEvent(
    categoryId: UUID
) : BaseDomainEvent(categoryId, "Category")

class CategoryCreatedEvent(
    categoryId: UUID,
    val code: String,
    val name: String,
    val parentId: UUID?
) : CategoryEvent(categoryId) {
    override val eventType = "CategoryCreated"

    override fun toEventData(): Map<String, Any?> = mapOf(
        "categoryId" to aggregateId.toString(),
        "code" to code,
        "name" to name,
        "parentId" to parentId?.toString()
    )
}

class CategoryUpdatedEvent(
    categoryId: UUID,
    val changes: Map<String, Any?>
) : CategoryEvent(categoryId) {
    override val eventType = "CategoryUpdated"

    override fun toEventData(): Map<String, Any?> = mapOf(
        "categoryId" to aggregateId.toString(),
        "changes" to changes
    )
}

class CategoryDeletedEvent(
    categoryId: UUID,
    val code: String
) : CategoryEvent(categoryId) {
    override val eventType = "CategoryDeleted"

    override fun toEventData(): Map<String, Any?> = mapOf(
        "categoryId" to aggregateId.toString(),
        "code" to code
    )
}

// ============================================
// Import/Export Events
// ============================================

sealed class ImportExportEvent(
    jobId: UUID
) : BaseDomainEvent(jobId, "ImportExport")

class ImportStartedEvent(
    jobId: UUID,
    val fileName: String,
    val totalRecords: Int,
    val startedBy: UUID
) : ImportExportEvent(jobId) {
    override val eventType = "ImportStarted"

    override fun toEventData(): Map<String, Any?> = mapOf(
        "jobId" to aggregateId.toString(),
        "fileName" to fileName,
        "totalRecords" to totalRecords,
        "startedBy" to startedBy.toString()
    )
}

class ImportCompletedEvent(
    jobId: UUID,
    val successCount: Int,
    val errorCount: Int,
    val duration: Long
) : ImportExportEvent(jobId) {
    override val eventType = "ImportCompleted"

    override fun toEventData(): Map<String, Any?> = mapOf(
        "jobId" to aggregateId.toString(),
        "successCount" to successCount,
        "errorCount" to errorCount,
        "durationMs" to duration
    )
}

class ImportFailedEvent(
    jobId: UUID,
    val reason: String,
    val processedCount: Int
) : ImportExportEvent(jobId) {
    override val eventType = "ImportFailed"

    override fun toEventData(): Map<String, Any?> = mapOf(
        "jobId" to aggregateId.toString(),
        "reason" to reason,
        "processedCount" to processedCount
    )
}

class ExportCompletedEvent(
    jobId: UUID,
    val format: String,
    val recordCount: Int,
    val fileSize: Long
) : ImportExportEvent(jobId) {
    override val eventType = "ExportCompleted"

    override fun toEventData(): Map<String, Any?> = mapOf(
        "jobId" to aggregateId.toString(),
        "format" to format,
        "recordCount" to recordCount,
        "fileSize" to fileSize
    )
}

// ============================================
// Quality Events
// ============================================

class QualityCheckCompletedEvent(
    productId: UUID,
    val score: Int,
    val violations: List<String>,
    val passedRules: List<String>
) : ProductEvent(productId) {
    override val eventType = "QualityCheckCompleted"

    override fun toEventData(): Map<String, Any?> = mapOf(
        "productId" to aggregateId.toString(),
        "score" to score,
        "violations" to violations,
        "passedRules" to passedRules
    )
}
