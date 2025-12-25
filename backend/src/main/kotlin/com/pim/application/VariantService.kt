package com.pim.application

import com.pim.domain.product.Product
import com.pim.domain.product.ProductStatus
import com.pim.domain.product.ProductType
import com.pim.domain.variant.*
import com.pim.infrastructure.persistence.*
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.*

// DTOs
data class VariantAxisDto(
    val id: UUID? = null,
    val code: String,
    val name: String,
    val description: String? = null,
    val attributeId: UUID? = null,
    val position: Int = 0,
    val isActive: Boolean = true
)

data class VariantAxisResponse(
    val id: UUID,
    val code: String,
    val name: String,
    val description: String?,
    val attributeId: UUID?,
    val attributeCode: String?,
    val attributeName: String?,
    val position: Int,
    val isActive: Boolean,
    val createdAt: Instant,
    val updatedAt: Instant
)

data class CreateVariantRequest(
    val sku: String? = null, // Se null, gera automaticamente
    val name: String? = null, // Se null, herda do pai
    val axisValues: Map<UUID, String>, // axisId -> value
    val price: java.math.BigDecimal? = null,
    val stockQuantity: Int? = null
)

data class VariantResponse(
    val id: UUID,
    val sku: String,
    val name: String,
    val price: java.math.BigDecimal?,
    val status: String,
    val stockQuantity: Int,
    val isInStock: Boolean,
    val axisValues: List<AxisValueResponse>,
    val mainImage: String?,
    val createdAt: Instant
)

data class AxisValueResponse(
    val axisId: UUID,
    val axisCode: String,
    val axisName: String,
    val value: String,
    val label: String?,
    val colorCode: String?,
    val imageUrl: String?
)

data class VariantConfigResponse(
    val productId: UUID,
    val axes: List<VariantAxisResponse>,
    val autoGenerateSku: Boolean,
    val skuPattern: String?,
    val variants: List<VariantResponse>
)

data class VariantMatrixEntry(
    val combination: Map<String, String>, // axisCode -> value
    val exists: Boolean,
    val variantId: UUID?,
    val sku: String?
)

@Service
class VariantService(
    private val variantAxisRepository: VariantAxisRepository,
    private val productVariantConfigRepository: ProductVariantConfigRepository,
    private val variantAttributeValueRepository: VariantAttributeValueRepository,
    private val productRepository: ProductRepository,
    private val attributeRepository: AttributeRepository
) {

    // ==================== VARIANT AXES ====================

    fun getAllAxes(): List<VariantAxisResponse> {
        return variantAxisRepository.findAllByOrderByPositionAsc().map { toAxisResponse(it) }
    }

    fun getActiveAxes(): List<VariantAxisResponse> {
        return variantAxisRepository.findByIsActiveOrderByPositionAsc(true).map { toAxisResponse(it) }
    }

    fun getAxis(id: UUID): VariantAxisResponse? {
        return variantAxisRepository.findById(id).orElse(null)?.let { toAxisResponse(it) }
    }

    @Transactional
    fun createAxis(dto: VariantAxisDto): VariantAxisResponse {
        if (variantAxisRepository.existsByCode(dto.code)) {
            throw IllegalArgumentException("Eixo com código '${dto.code}' já existe")
        }

        // Verify attribute exists if provided
        dto.attributeId?.let { attrId ->
            if (!attributeRepository.existsById(attrId)) {
                throw IllegalArgumentException("Atributo não encontrado")
            }
        }

        val axis = VariantAxis(
            code = dto.code,
            name = dto.name,
            description = dto.description,
            attributeId = dto.attributeId,
            position = dto.position,
            isActive = dto.isActive
        )

        return toAxisResponse(variantAxisRepository.save(axis))
    }

    @Transactional
    fun updateAxis(id: UUID, dto: VariantAxisDto): VariantAxisResponse {
        val axis = variantAxisRepository.findById(id).orElseThrow {
            IllegalArgumentException("Eixo não encontrado")
        }

        if (dto.code != axis.code && variantAxisRepository.existsByCode(dto.code)) {
            throw IllegalArgumentException("Eixo com código '${dto.code}' já existe")
        }

        axis.apply {
            code = dto.code
            name = dto.name
            description = dto.description
            attributeId = dto.attributeId
            position = dto.position
            isActive = dto.isActive
        }

        return toAxisResponse(variantAxisRepository.save(axis))
    }

    @Transactional
    fun deleteAxis(id: UUID) {
        // Check if axis is in use
        val values = variantAttributeValueRepository.findByAxisId(id)
        if (values.isNotEmpty()) {
            throw IllegalArgumentException("Não é possível excluir. Este eixo está em uso em ${values.size} variantes.")
        }
        variantAxisRepository.deleteById(id)
    }

    // ==================== VARIANT CONFIG ====================

    fun getVariantConfig(productId: UUID): VariantConfigResponse? {
        val product = productRepository.findById(productId).orElse(null) ?: return null
        if (product.type != ProductType.CONFIGURABLE) {
            return null
        }

        val config = productVariantConfigRepository.findByProductId(productId)
        val axes = if (config != null) {
            config.axisIds.mapNotNull { axisId ->
                variantAxisRepository.findById(axisId).orElse(null)?.let { toAxisResponse(it) }
            }
        } else emptyList()

        val variants = product.variants.map { toVariantResponse(it) }

        return VariantConfigResponse(
            productId = productId,
            axes = axes,
            autoGenerateSku = config?.autoGenerateSku ?: true,
            skuPattern = config?.skuPattern,
            variants = variants
        )
    }

    @Transactional
    fun configureVariants(productId: UUID, axisIds: List<UUID>, skuPattern: String? = null): VariantConfigResponse {
        val product = productRepository.findById(productId).orElseThrow {
            IllegalArgumentException("Produto não encontrado")
        }

        // Update product type to configurable
        if (product.type != ProductType.CONFIGURABLE) {
            product.type = ProductType.CONFIGURABLE
            productRepository.save(product)
        }

        // Validate axes exist
        val validAxisIds = axisIds.filter { variantAxisRepository.existsById(it) }
        if (validAxisIds.isEmpty()) {
            throw IllegalArgumentException("Pelo menos um eixo de variação válido é necessário")
        }

        // Create or update config
        val existingConfig = productVariantConfigRepository.findByProductId(productId)
        val config = if (existingConfig != null) {
            existingConfig.axisIds = validAxisIds.toMutableSet()
            existingConfig.skuPattern = skuPattern
            productVariantConfigRepository.save(existingConfig)
        } else {
            val newConfig = ProductVariantConfig(
                productId = productId,
                axisIds = validAxisIds.toMutableSet(),
                skuPattern = skuPattern
            )
            productVariantConfigRepository.save(newConfig)
        }

        return getVariantConfig(productId)!!
    }

    // ==================== VARIANT CRUD ====================

    @Transactional
    fun createVariant(parentId: UUID, request: CreateVariantRequest): VariantResponse {
        val parent = productRepository.findById(parentId).orElseThrow {
            IllegalArgumentException("Produto pai não encontrado")
        }

        if (parent.type != ProductType.CONFIGURABLE) {
            throw IllegalArgumentException("Produto não é do tipo configurável")
        }

        val config = productVariantConfigRepository.findByProductId(parentId)
            ?: throw IllegalArgumentException("Produto não tem configuração de variantes")

        // Validate all required axes are provided
        for (axisId in config.axisIds) {
            if (!request.axisValues.containsKey(axisId)) {
                val axis = variantAxisRepository.findById(axisId).orElse(null)
                throw IllegalArgumentException("Valor do eixo '${axis?.name ?: axisId}' é obrigatório")
            }
        }

        // Generate SKU
        val sku = request.sku ?: generateVariantSku(parent, config, request.axisValues)

        // Check SKU uniqueness
        if (productRepository.existsBySku(sku)) {
            throw IllegalArgumentException("SKU '$sku' já existe")
        }

        // Create variant product
        val variant = Product(
            sku = sku,
            name = request.name ?: buildVariantName(parent, request.axisValues),
            description = parent.description,
            price = request.price ?: parent.price,
            type = ProductType.SIMPLE,
            status = ProductStatus.DRAFT,
            parent = parent,
            stockQuantity = request.stockQuantity ?: 0,
            weight = parent.weight,
            brand = parent.brand,
            manufacturer = parent.manufacturer
        )

        // Copy categories from parent
        variant.categories.addAll(parent.categories)

        val savedVariant = productRepository.save(variant)

        // Save axis values
        for ((axisId, value) in request.axisValues) {
            if (config.axisIds.contains(axisId)) {
                val axis = variantAxisRepository.findById(axisId).orElse(null)
                val axisValue = VariantAttributeValue(
                    variantId = savedVariant.id,
                    axisId = axisId,
                    value = value,
                    label = axis?.name?.let { "$it: $value" }
                )
                variantAttributeValueRepository.save(axisValue)
            }
        }

        return toVariantResponse(savedVariant)
    }

    @Transactional
    fun updateVariant(variantId: UUID, request: CreateVariantRequest): VariantResponse {
        val variant = productRepository.findById(variantId).orElseThrow {
            IllegalArgumentException("Variante não encontrada")
        }

        if (variant.parent == null) {
            throw IllegalArgumentException("Produto não é uma variante")
        }

        // Update basic fields
        request.price?.let { variant.price = it }
        request.stockQuantity?.let { variant.stockQuantity = it }
        request.name?.let { variant.name = it }

        // Update axis values
        for ((axisId, value) in request.axisValues) {
            val existingValue = variantAttributeValueRepository.findByVariantIdAndAxisId(variantId, axisId)
            if (existingValue != null) {
                existingValue.value = value
                variantAttributeValueRepository.save(existingValue)
            } else {
                val axis = variantAxisRepository.findById(axisId).orElse(null)
                val axisValue = VariantAttributeValue(
                    variantId = variantId,
                    axisId = axisId,
                    value = value,
                    label = axis?.name?.let { "$it: $value" }
                )
                variantAttributeValueRepository.save(axisValue)
            }
        }

        return toVariantResponse(productRepository.save(variant))
    }

    @Transactional
    fun deleteVariant(variantId: UUID) {
        val variant = productRepository.findById(variantId).orElseThrow {
            IllegalArgumentException("Variante não encontrada")
        }

        if (variant.parent == null) {
            throw IllegalArgumentException("Produto não é uma variante")
        }

        // Delete axis values
        variantAttributeValueRepository.deleteByVariantId(variantId)

        // Delete variant product
        productRepository.delete(variant)
    }

    fun getVariants(parentId: UUID): List<VariantResponse> {
        val parent = productRepository.findById(parentId).orElse(null) ?: return emptyList()
        return parent.variants.map { toVariantResponse(it) }
    }

    // ==================== VARIANT MATRIX ====================

    fun getVariantMatrix(parentId: UUID): List<VariantMatrixEntry> {
        val config = productVariantConfigRepository.findByProductId(parentId) ?: return emptyList()
        val parent = productRepository.findById(parentId).orElse(null) ?: return emptyList()

        val axes = config.axisIds.mapNotNull { variantAxisRepository.findById(it).orElse(null) }
        if (axes.isEmpty()) return emptyList()

        // Get all possible values for each axis
        val axisValues = axes.associate { axis ->
            val values = variantAttributeValueRepository.findDistinctValuesByParentAndAxis(parentId, axis.id)
            axis.code to values
        }

        // Generate combinations
        val combinations = generateCombinations(axisValues)

        // Check which combinations exist
        return combinations.map { combination ->
            val existingVariant = findVariantByCombination(parent, combination)
            VariantMatrixEntry(
                combination = combination,
                exists = existingVariant != null,
                variantId = existingVariant?.id,
                sku = existingVariant?.sku
            )
        }
    }

    @Transactional
    fun bulkCreateVariants(parentId: UUID, combinations: List<Map<UUID, String>>): List<VariantResponse> {
        return combinations.mapNotNull { axisValues ->
            try {
                createVariant(parentId, CreateVariantRequest(axisValues = axisValues))
            } catch (e: Exception) {
                null
            }
        }
    }

    // ==================== HELPERS ====================

    private fun generateVariantSku(parent: Product, config: ProductVariantConfig, axisValues: Map<UUID, String>): String {
        if (config.skuPattern != null) {
            var sku = config.skuPattern!!
            sku = sku.replace("{parent_sku}", parent.sku)

            for ((axisId, value) in axisValues) {
                val axis = variantAxisRepository.findById(axisId).orElse(null)
                if (axis != null) {
                    sku = sku.replace("{${axis.code}}", value.uppercase().replace(" ", "_"))
                }
            }
            return sku
        }

        // Default pattern: parent_sku-value1-value2
        val values = config.axisIds.mapNotNull { axisValues[it] }
            .map { it.uppercase().replace(" ", "_").take(10) }
        return "${parent.sku}-${values.joinToString("-")}"
    }

    private fun buildVariantName(parent: Product, axisValues: Map<UUID, String>): String {
        val valueLabels = axisValues.entries.mapNotNull { (axisId, value) ->
            val axis = variantAxisRepository.findById(axisId).orElse(null)
            if (axis != null) "${axis.name}: $value" else value
        }
        return "${parent.name} - ${valueLabels.joinToString(", ")}"
    }

    private fun findVariantByCombination(parent: Product, combination: Map<String, String>): Product? {
        return parent.variants.find { variant ->
            val variantValues = variantAttributeValueRepository.findByVariantId(variant.id)
            val variantCombination = variantValues.associate { vav ->
                val axis = variantAxisRepository.findById(vav.axisId).orElse(null)
                (axis?.code ?: "") to vav.value
            }
            variantCombination == combination
        }
    }

    private fun generateCombinations(axisValues: Map<String, List<String>>): List<Map<String, String>> {
        if (axisValues.isEmpty()) return emptyList()

        val keys = axisValues.keys.toList()
        val result = mutableListOf<Map<String, String>>()

        fun generate(index: Int, current: MutableMap<String, String>) {
            if (index == keys.size) {
                result.add(current.toMap())
                return
            }
            val key = keys[index]
            for (value in axisValues[key] ?: emptyList()) {
                current[key] = value
                generate(index + 1, current)
            }
        }

        generate(0, mutableMapOf())
        return result
    }

    private fun toAxisResponse(axis: VariantAxis): VariantAxisResponse {
        val attribute = axis.attributeId?.let { attributeRepository.findById(it).orElse(null) }

        return VariantAxisResponse(
            id = axis.id,
            code = axis.code,
            name = axis.name,
            description = axis.description,
            attributeId = axis.attributeId,
            attributeCode = attribute?.code,
            attributeName = attribute?.name,
            position = axis.position,
            isActive = axis.isActive,
            createdAt = axis.createdAt,
            updatedAt = axis.updatedAt
        )
    }

    private fun toVariantResponse(variant: Product): VariantResponse {
        val axisValues = variantAttributeValueRepository.findByVariantId(variant.id).map { vav ->
            val axis = variantAxisRepository.findById(vav.axisId).orElse(null)
            AxisValueResponse(
                axisId = vav.axisId,
                axisCode = axis?.code ?: "",
                axisName = axis?.name ?: "",
                value = vav.value,
                label = vav.label,
                colorCode = vav.colorCode,
                imageUrl = vav.imageUrl
            )
        }

        val mainImage = variant.media.firstOrNull { it.isMain }?.url

        return VariantResponse(
            id = variant.id,
            sku = variant.sku,
            name = variant.name,
            price = variant.price,
            status = variant.status.name,
            stockQuantity = variant.stockQuantity,
            isInStock = variant.isInStock,
            axisValues = axisValues,
            mainImage = mainImage,
            createdAt = variant.createdAt
        )
    }
}
