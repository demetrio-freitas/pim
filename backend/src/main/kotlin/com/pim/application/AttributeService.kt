package com.pim.application

import com.pim.domain.attribute.Attribute
import com.pim.domain.attribute.AttributeGroup
import com.pim.infrastructure.persistence.AttributeRepository
import com.pim.infrastructure.persistence.AttributeGroupRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

@Service
class AttributeService(
    private val attributeRepository: AttributeRepository,
    private val attributeGroupRepository: AttributeGroupRepository
) {

    @Transactional(readOnly = true)
    fun findAllAttributes(): List<Attribute> {
        return attributeRepository.findAll()
    }

    @Transactional(readOnly = true)
    fun findAttributeById(id: UUID): Attribute? {
        return attributeRepository.findByIdWithOptions(id)
    }

    @Transactional(readOnly = true)
    fun findAttributeByCode(code: String): Attribute? {
        return attributeRepository.findByCode(code)
    }

    @Transactional
    fun createAttribute(attribute: Attribute): Attribute {
        if (attributeRepository.existsByCode(attribute.code)) {
            throw IllegalArgumentException("Attribute with code '${attribute.code}' already exists")
        }
        return attributeRepository.save(attribute)
    }

    @Transactional
    fun updateAttribute(id: UUID, updateFn: (Attribute) -> Unit): Attribute {
        val attribute = attributeRepository.findById(id)
            .orElseThrow { NoSuchElementException("Attribute not found with id: $id") }
        updateFn(attribute)
        return attributeRepository.save(attribute)
    }

    @Transactional
    fun deleteAttribute(id: UUID) {
        if (!attributeRepository.existsById(id)) {
            throw NoSuchElementException("Attribute not found with id: $id")
        }
        attributeRepository.deleteById(id)
    }

    @Transactional(readOnly = true)
    fun findAllGroups(): List<AttributeGroup> {
        return attributeGroupRepository.findAllOrdered()
    }

    @Transactional(readOnly = true)
    fun findGroupById(id: UUID): AttributeGroup? {
        return attributeGroupRepository.findByIdWithAttributes(id)
    }

    @Transactional
    fun createGroup(group: AttributeGroup): AttributeGroup {
        if (attributeGroupRepository.existsByCode(group.code)) {
            throw IllegalArgumentException("Attribute group with code '${group.code}' already exists")
        }
        return attributeGroupRepository.save(group)
    }

    @Transactional
    fun updateGroup(id: UUID, updateFn: (AttributeGroup) -> Unit): AttributeGroup {
        val group = attributeGroupRepository.findById(id)
            .orElseThrow { NoSuchElementException("Attribute group not found with id: $id") }
        updateFn(group)
        return attributeGroupRepository.save(group)
    }

    @Transactional
    fun deleteGroup(id: UUID) {
        if (!attributeGroupRepository.existsById(id)) {
            throw NoSuchElementException("Attribute group not found with id: $id")
        }
        attributeGroupRepository.deleteById(id)
    }
}
