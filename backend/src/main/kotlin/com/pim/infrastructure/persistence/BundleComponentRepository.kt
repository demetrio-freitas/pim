package com.pim.infrastructure.persistence

import com.pim.domain.product.BundleComponent
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface BundleComponentRepository : JpaRepository<BundleComponent, UUID> {

    fun findByBundleIdOrderByPositionAsc(bundleId: UUID): List<BundleComponent>

    fun deleteByBundleId(bundleId: UUID)

    fun existsByBundleIdAndComponentId(bundleId: UUID, componentId: UUID): Boolean

    @Query("SELECT bc FROM BundleComponent bc WHERE bc.componentId = :productId")
    fun findBundlesContainingProduct(@Param("productId") productId: UUID): List<BundleComponent>
}
