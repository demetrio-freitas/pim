package com.pim.infrastructure.persistence

import com.pim.domain.dataimport.ImportJob
import com.pim.domain.dataimport.ImportStatus
import com.pim.domain.dataimport.ImportType
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface ImportJobRepository : JpaRepository<ImportJob, UUID> {
    fun findByUserIdOrderByCreatedAtDesc(userId: UUID, pageable: Pageable): Page<ImportJob>
    fun findByStatusOrderByCreatedAtDesc(status: ImportStatus, pageable: Pageable): Page<ImportJob>
    fun findByTypeOrderByCreatedAtDesc(type: ImportType, pageable: Pageable): Page<ImportJob>
    fun findAllByOrderByCreatedAtDesc(pageable: Pageable): Page<ImportJob>
}
