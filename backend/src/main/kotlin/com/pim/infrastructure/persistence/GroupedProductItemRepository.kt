package com.pim.infrastructure.persistence

import com.pim.domain.product.GroupedProductItem
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface GroupedProductItemRepository : JpaRepository<GroupedProductItem, UUID> {

    fun findByParentIdOrderByPositionAsc(parentId: UUID): List<GroupedProductItem>

    fun deleteByParentId(parentId: UUID)

    fun existsByParentIdAndChildId(parentId: UUID, childId: UUID): Boolean

    @Query("SELECT gpi FROM GroupedProductItem gpi WHERE gpi.childId = :productId")
    fun findGroupsContainingProduct(@Param("productId") productId: UUID): List<GroupedProductItem>
}
