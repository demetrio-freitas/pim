package com.pim.application

import com.pim.domain.product.*
import com.pim.domain.shared.ProductNotFoundException
import com.pim.infrastructure.persistence.BundleComponentRepository
import com.pim.infrastructure.persistence.GroupedProductItemRepository
import com.pim.infrastructure.persistence.ProductRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.util.*

// DTOs for Bundle Components
data class BundleComponentDto(
    val id: UUID? = null,
    val componentId: UUID,
    val quantity: Int = 1,
    val position: Int = 0,
    val specialPrice: BigDecimal? = null
)

data class BundleComponentResponse(
    val id: UUID,
    val componentId: UUID,
    val componentSku: String,
    val componentName: String,
    val quantity: Int,
    val position: Int,
    val specialPrice: BigDecimal?,
    val componentPrice: BigDecimal?,
    val componentStock: Int
)

// DTOs for Grouped Products
data class GroupedProductItemDto(
    val id: UUID? = null,
    val childId: UUID,
    val defaultQuantity: Int = 1,
    val minQuantity: Int = 0,
    val maxQuantity: Int? = null,
    val position: Int = 0
)

data class GroupedProductItemResponse(
    val id: UUID,
    val childId: UUID,
    val childSku: String,
    val childName: String,
    val defaultQuantity: Int,
    val minQuantity: Int,
    val maxQuantity: Int?,
    val position: Int,
    val childPrice: BigDecimal?,
    val childStock: Int
)

// Response DTOs
data class ProductTypeInfo(
    val productId: UUID,
    val productSku: String,
    val productName: String,
    val type: ProductType,
    val canConvertTo: List<ProductType>,
    val bundleComponents: List<BundleComponentResponse>?,
    val groupedItems: List<GroupedProductItemResponse>?,
    val variantsCount: Int?
)

data class StockValidationResult(
    val isValid: Boolean,
    val message: String?,
    val availableQuantity: Int?,
    val requestedQuantity: Int?
)

data class StockDecrementResult(
    val success: Boolean,
    val message: String?,
    val decrementedProducts: List<DecrementedProduct>
)

data class DecrementedProduct(
    val productId: UUID,
    val sku: String,
    val previousStock: Int,
    val newStock: Int,
    val decrementedAmount: Int
)

@Service
@Transactional
class ProductTypeService(
    private val productRepository: ProductRepository,
    private val bundleComponentRepository: BundleComponentRepository,
    private val groupedProductItemRepository: GroupedProductItemRepository
) {
    private val logger = LoggerFactory.getLogger(ProductTypeService::class.java)

    /**
     * Get product type information with related data
     */
    @Transactional(readOnly = true)
    fun getProductTypeInfo(productId: UUID): ProductTypeInfo {
        val product = productRepository.findById(productId)
            .orElseThrow { ProductNotFoundException(productId) }

        val bundleComponents = if (product.type == ProductType.BUNDLE) {
            getBundleComponents(productId)
        } else null

        val groupedItems = if (product.type == ProductType.GROUPED) {
            getGroupedItems(productId)
        } else null

        val variantsCount = if (product.type == ProductType.CONFIGURABLE) {
            productRepository.countVariantsByParentId(productId)
        } else null

        return ProductTypeInfo(
            productId = product.id,
            productSku = product.sku,
            productName = product.name,
            type = product.type,
            canConvertTo = getConvertibleTypes(product),
            bundleComponents = bundleComponents,
            groupedItems = groupedItems,
            variantsCount = variantsCount?.toInt()
        )
    }

    /**
     * Convert product from one type to another with validation
     */
    fun convertProductType(productId: UUID, targetType: ProductType): Product {
        val product = productRepository.findById(productId)
            .orElseThrow { ProductNotFoundException(productId) }

        val currentType = product.type

        // Validate conversion rules
        validateTypeConversion(product, targetType)

        // Clean up old type-specific data
        when (currentType) {
            ProductType.BUNDLE -> {
                bundleComponentRepository.deleteByBundleId(productId)
                logger.info("Removed bundle components from product $productId")
            }
            ProductType.GROUPED -> {
                groupedProductItemRepository.deleteByParentId(productId)
                logger.info("Removed grouped items from product $productId")
            }
            ProductType.CONFIGURABLE -> {
                // Variants are kept but product becomes parent-less simple products
                product.variants.forEach { variant ->
                    variant.parent = null
                    variant.type = ProductType.SIMPLE
                    productRepository.save(variant)
                }
                product.variants.clear()
                logger.info("Detached variants from product $productId")
            }
            else -> {}
        }

        // Apply type-specific settings for new type
        when (targetType) {
            ProductType.VIRTUAL -> {
                product.requiresShipping = false
                product.stockQuantity = 0
                product.isInStock = true
            }
            ProductType.SIMPLE -> {
                product.requiresShipping = true
            }
            else -> {}
        }

        product.type = targetType
        val saved = productRepository.save(product)
        logger.info("Converted product $productId from $currentType to $targetType")
        return saved
    }

    /**
     * Validate if type conversion is allowed
     */
    private fun validateTypeConversion(product: Product, targetType: ProductType) {
        val currentType = product.type

        if (currentType == targetType) {
            throw IllegalArgumentException("Product is already of type $targetType")
        }

        // CONFIGURABLE with existing variants can't be converted
        if (currentType == ProductType.CONFIGURABLE) {
            val variantsCount = productRepository.countVariantsByParentId(product.id)
            if (variantsCount > 0 && targetType != ProductType.CONFIGURABLE) {
                throw IllegalArgumentException(
                    "Cannot convert CONFIGURABLE product with $variantsCount variants. Remove variants first."
                )
            }
        }

        // Variants (child products) cannot be converted
        if (product.parent != null) {
            throw IllegalArgumentException("Cannot convert variant products. Convert the parent product instead.")
        }
    }

    /**
     * Get list of types this product can be converted to
     */
    private fun getConvertibleTypes(product: Product): List<ProductType> {
        if (product.parent != null) {
            return emptyList() // Variants cannot be converted
        }

        val allTypes = ProductType.entries.filter { it != product.type }

        // If CONFIGURABLE with variants, only allow keeping CONFIGURABLE
        if (product.type == ProductType.CONFIGURABLE) {
            val variantsCount = productRepository.countVariantsByParentId(product.id)
            if (variantsCount > 0) {
                return emptyList()
            }
        }

        return allTypes
    }

    // ==================== BUNDLE OPERATIONS ====================

    /**
     * Get bundle components for a product
     */
    @Transactional(readOnly = true)
    fun getBundleComponents(bundleId: UUID): List<BundleComponentResponse> {
        val components = bundleComponentRepository.findByBundleIdOrderByPositionAsc(bundleId)
        return components.map { component ->
            val product = productRepository.findById(component.componentId).orElse(null)
            BundleComponentResponse(
                id = component.id,
                componentId = component.componentId,
                componentSku = product?.sku ?: "DELETED",
                componentName = product?.name ?: "Produto removido",
                quantity = component.quantity,
                position = component.position,
                specialPrice = component.specialPrice,
                componentPrice = product?.price,
                componentStock = product?.stockQuantity ?: 0
            )
        }
    }

    /**
     * Add a component to a bundle
     */
    fun addBundleComponent(bundleId: UUID, dto: BundleComponentDto): BundleComponentResponse {
        val bundle = productRepository.findById(bundleId)
            .orElseThrow { ProductNotFoundException(bundleId) }

        if (bundle.type != ProductType.BUNDLE) {
            throw IllegalArgumentException("Product $bundleId is not a BUNDLE type")
        }

        val component = productRepository.findById(dto.componentId)
            .orElseThrow { ProductNotFoundException(dto.componentId) }

        // Validate: can't add itself
        if (dto.componentId == bundleId) {
            throw IllegalArgumentException("Cannot add a bundle to itself")
        }

        // Validate: can't add bundles as components (prevent circular)
        if (component.type == ProductType.BUNDLE) {
            throw IllegalArgumentException("Cannot add another BUNDLE as a component")
        }

        // Validate: can't add variants
        if (component.parent != null) {
            throw IllegalArgumentException("Cannot add variant products as bundle components")
        }

        // Check if already exists
        if (bundleComponentRepository.existsByBundleIdAndComponentId(bundleId, dto.componentId)) {
            throw IllegalArgumentException("Component ${dto.componentId} is already in this bundle")
        }

        val bundleComponent = BundleComponent(
            bundleId = bundleId,
            componentId = dto.componentId,
            quantity = dto.quantity.coerceAtLeast(1),
            position = dto.position,
            specialPrice = dto.specialPrice
        )

        val saved = bundleComponentRepository.save(bundleComponent)
        logger.info("Added component ${dto.componentId} to bundle $bundleId")

        return BundleComponentResponse(
            id = saved.id,
            componentId = saved.componentId,
            componentSku = component.sku,
            componentName = component.name,
            quantity = saved.quantity,
            position = saved.position,
            specialPrice = saved.specialPrice,
            componentPrice = component.price,
            componentStock = component.stockQuantity
        )
    }

    /**
     * Update a bundle component
     */
    fun updateBundleComponent(componentId: UUID, dto: BundleComponentDto): BundleComponentResponse {
        val bundleComponent = bundleComponentRepository.findById(componentId)
            .orElseThrow { IllegalArgumentException("Bundle component $componentId not found") }

        bundleComponent.quantity = dto.quantity.coerceAtLeast(1)
        bundleComponent.position = dto.position
        bundleComponent.specialPrice = dto.specialPrice

        val saved = bundleComponentRepository.save(bundleComponent)

        val product = productRepository.findById(saved.componentId).orElse(null)

        return BundleComponentResponse(
            id = saved.id,
            componentId = saved.componentId,
            componentSku = product?.sku ?: "DELETED",
            componentName = product?.name ?: "Produto removido",
            quantity = saved.quantity,
            position = saved.position,
            specialPrice = saved.specialPrice,
            componentPrice = product?.price,
            componentStock = product?.stockQuantity ?: 0
        )
    }

    /**
     * Remove a component from bundle
     */
    fun removeBundleComponent(componentId: UUID) {
        if (!bundleComponentRepository.existsById(componentId)) {
            throw IllegalArgumentException("Bundle component $componentId not found")
        }
        bundleComponentRepository.deleteById(componentId)
        logger.info("Removed bundle component $componentId")
    }

    /**
     * Set all bundle components at once (replace existing)
     */
    fun setBundleComponents(bundleId: UUID, components: List<BundleComponentDto>): List<BundleComponentResponse> {
        val bundle = productRepository.findById(bundleId)
            .orElseThrow { ProductNotFoundException(bundleId) }

        if (bundle.type != ProductType.BUNDLE) {
            throw IllegalArgumentException("Product $bundleId is not a BUNDLE type")
        }

        // Remove existing components
        bundleComponentRepository.deleteByBundleId(bundleId)

        // Add new components
        return components.mapIndexed { index, dto ->
            addBundleComponent(bundleId, dto.copy(position = dto.position.takeIf { it > 0 } ?: index))
        }
    }

    // ==================== GROUPED PRODUCT OPERATIONS ====================

    /**
     * Get grouped items for a product
     */
    @Transactional(readOnly = true)
    fun getGroupedItems(parentId: UUID): List<GroupedProductItemResponse> {
        val items = groupedProductItemRepository.findByParentIdOrderByPositionAsc(parentId)
        return items.map { item ->
            val product = productRepository.findById(item.childId).orElse(null)
            GroupedProductItemResponse(
                id = item.id,
                childId = item.childId,
                childSku = product?.sku ?: "DELETED",
                childName = product?.name ?: "Produto removido",
                defaultQuantity = item.defaultQuantity,
                minQuantity = item.minQuantity,
                maxQuantity = item.maxQuantity,
                position = item.position,
                childPrice = product?.price,
                childStock = product?.stockQuantity ?: 0
            )
        }
    }

    /**
     * Add a product to a grouped product
     */
    fun addGroupedItem(parentId: UUID, dto: GroupedProductItemDto): GroupedProductItemResponse {
        val parent = productRepository.findById(parentId)
            .orElseThrow { ProductNotFoundException(parentId) }

        if (parent.type != ProductType.GROUPED) {
            throw IllegalArgumentException("Product $parentId is not a GROUPED type")
        }

        val child = productRepository.findById(dto.childId)
            .orElseThrow { ProductNotFoundException(dto.childId) }

        // Validate: can't add itself
        if (dto.childId == parentId) {
            throw IllegalArgumentException("Cannot add a product to itself")
        }

        // Validate: can't add grouped products (prevent circular)
        if (child.type == ProductType.GROUPED) {
            throw IllegalArgumentException("Cannot add another GROUPED product as a child")
        }

        // Validate: can't add variants
        if (child.parent != null) {
            throw IllegalArgumentException("Cannot add variant products to grouped products")
        }

        // Check if already exists
        if (groupedProductItemRepository.existsByParentIdAndChildId(parentId, dto.childId)) {
            throw IllegalArgumentException("Product ${dto.childId} is already in this grouped product")
        }

        val groupedItem = GroupedProductItem(
            parentId = parentId,
            childId = dto.childId,
            defaultQuantity = dto.defaultQuantity.coerceAtLeast(1),
            minQuantity = dto.minQuantity.coerceAtLeast(0),
            maxQuantity = dto.maxQuantity,
            position = dto.position
        )

        val saved = groupedProductItemRepository.save(groupedItem)
        logger.info("Added product ${dto.childId} to grouped product $parentId")

        return GroupedProductItemResponse(
            id = saved.id,
            childId = saved.childId,
            childSku = child.sku,
            childName = child.name,
            defaultQuantity = saved.defaultQuantity,
            minQuantity = saved.minQuantity,
            maxQuantity = saved.maxQuantity,
            position = saved.position,
            childPrice = child.price,
            childStock = child.stockQuantity
        )
    }

    /**
     * Update a grouped item
     */
    fun updateGroupedItem(itemId: UUID, dto: GroupedProductItemDto): GroupedProductItemResponse {
        val item = groupedProductItemRepository.findById(itemId)
            .orElseThrow { IllegalArgumentException("Grouped item $itemId not found") }

        item.defaultQuantity = dto.defaultQuantity.coerceAtLeast(1)
        item.minQuantity = dto.minQuantity.coerceAtLeast(0)
        item.maxQuantity = dto.maxQuantity
        item.position = dto.position

        val saved = groupedProductItemRepository.save(item)

        val product = productRepository.findById(saved.childId).orElse(null)

        return GroupedProductItemResponse(
            id = saved.id,
            childId = saved.childId,
            childSku = product?.sku ?: "DELETED",
            childName = product?.name ?: "Produto removido",
            defaultQuantity = saved.defaultQuantity,
            minQuantity = saved.minQuantity,
            maxQuantity = saved.maxQuantity,
            position = saved.position,
            childPrice = product?.price,
            childStock = product?.stockQuantity ?: 0
        )
    }

    /**
     * Remove an item from grouped product
     */
    fun removeGroupedItem(itemId: UUID) {
        if (!groupedProductItemRepository.existsById(itemId)) {
            throw IllegalArgumentException("Grouped item $itemId not found")
        }
        groupedProductItemRepository.deleteById(itemId)
        logger.info("Removed grouped item $itemId")
    }

    /**
     * Set all grouped items at once (replace existing)
     */
    fun setGroupedItems(parentId: UUID, items: List<GroupedProductItemDto>): List<GroupedProductItemResponse> {
        val parent = productRepository.findById(parentId)
            .orElseThrow { ProductNotFoundException(parentId) }

        if (parent.type != ProductType.GROUPED) {
            throw IllegalArgumentException("Product $parentId is not a GROUPED type")
        }

        // Remove existing items
        groupedProductItemRepository.deleteByParentId(parentId)

        // Add new items
        return items.mapIndexed { index, dto ->
            addGroupedItem(parentId, dto.copy(position = dto.position.takeIf { it > 0 } ?: index))
        }
    }

    // ==================== STOCK OPERATIONS ====================

    /**
     * Validate if stock operation is possible
     */
    @Transactional(readOnly = true)
    fun validateStockOperation(productId: UUID, quantity: Int): StockValidationResult {
        val product = productRepository.findById(productId)
            .orElseThrow { ProductNotFoundException(productId) }

        return when (product.type) {
            ProductType.VIRTUAL -> {
                // Virtual products always have stock
                StockValidationResult(
                    isValid = true,
                    message = "Virtual products have unlimited stock",
                    availableQuantity = Int.MAX_VALUE,
                    requestedQuantity = quantity
                )
            }
            ProductType.BUNDLE -> {
                // Check all components
                val components = bundleComponentRepository.findByBundleIdOrderByPositionAsc(productId)
                if (components.isEmpty()) {
                    return StockValidationResult(
                        isValid = false,
                        message = "Bundle has no components",
                        availableQuantity = 0,
                        requestedQuantity = quantity
                    )
                }

                var minAvailable = Int.MAX_VALUE
                val insufficientComponents = mutableListOf<String>()

                for (component in components) {
                    val componentProduct = productRepository.findById(component.componentId).orElse(null)
                    if (componentProduct == null) {
                        return StockValidationResult(
                            isValid = false,
                            message = "Component ${component.componentId} not found",
                            availableQuantity = 0,
                            requestedQuantity = quantity
                        )
                    }

                    val requiredQty = component.quantity * quantity
                    val availableQty = componentProduct.stockQuantity

                    if (availableQty < requiredQty) {
                        insufficientComponents.add(
                            "${componentProduct.sku}: needs $requiredQty, has $availableQty"
                        )
                    }

                    // Calculate how many bundles can be made with this component
                    val bundlesPossible = availableQty / component.quantity
                    minAvailable = minOf(minAvailable, bundlesPossible)
                }

                if (insufficientComponents.isNotEmpty()) {
                    StockValidationResult(
                        isValid = false,
                        message = "Insufficient stock: ${insufficientComponents.joinToString("; ")}",
                        availableQuantity = minAvailable,
                        requestedQuantity = quantity
                    )
                } else {
                    StockValidationResult(
                        isValid = true,
                        message = null,
                        availableQuantity = minAvailable,
                        requestedQuantity = quantity
                    )
                }
            }
            ProductType.GROUPED -> {
                // Grouped products don't have their own stock
                // Each child is purchased separately
                StockValidationResult(
                    isValid = true,
                    message = "Grouped products: check individual item stock",
                    availableQuantity = null,
                    requestedQuantity = quantity
                )
            }
            else -> {
                // SIMPLE and CONFIGURABLE (variants)
                val available = product.stockQuantity
                if (available >= quantity) {
                    StockValidationResult(
                        isValid = true,
                        message = null,
                        availableQuantity = available,
                        requestedQuantity = quantity
                    )
                } else {
                    StockValidationResult(
                        isValid = false,
                        message = "Insufficient stock: needs $quantity, has $available",
                        availableQuantity = available,
                        requestedQuantity = quantity
                    )
                }
            }
        }
    }

    /**
     * Decrement stock for a product (handles bundles automatically)
     */
    fun decrementStock(productId: UUID, quantity: Int): StockDecrementResult {
        val product = productRepository.findById(productId)
            .orElseThrow { ProductNotFoundException(productId) }

        // First validate
        val validation = validateStockOperation(productId, quantity)
        if (!validation.isValid) {
            return StockDecrementResult(
                success = false,
                message = validation.message,
                decrementedProducts = emptyList()
            )
        }

        val decrementedProducts = mutableListOf<DecrementedProduct>()

        when (product.type) {
            ProductType.VIRTUAL -> {
                // No stock to decrement
            }
            ProductType.BUNDLE -> {
                // Decrement all component stocks
                val components = bundleComponentRepository.findByBundleIdOrderByPositionAsc(productId)
                for (component in components) {
                    val componentProduct = productRepository.findById(component.componentId)
                        .orElseThrow { ProductNotFoundException(component.componentId) }

                    val decrementAmount = component.quantity * quantity
                    val previousStock = componentProduct.stockQuantity
                    componentProduct.stockQuantity -= decrementAmount
                    componentProduct.isInStock = componentProduct.stockQuantity > 0

                    productRepository.save(componentProduct)

                    decrementedProducts.add(
                        DecrementedProduct(
                            productId = componentProduct.id,
                            sku = componentProduct.sku,
                            previousStock = previousStock,
                            newStock = componentProduct.stockQuantity,
                            decrementedAmount = decrementAmount
                        )
                    )
                }
                logger.info("Decremented stock for bundle $productId: $quantity units")
            }
            ProductType.GROUPED -> {
                // Grouped products don't have their own stock
                // This would be called for individual items
            }
            else -> {
                // SIMPLE and variants
                val previousStock = product.stockQuantity
                product.stockQuantity -= quantity
                product.isInStock = product.stockQuantity > 0

                productRepository.save(product)

                decrementedProducts.add(
                    DecrementedProduct(
                        productId = product.id,
                        sku = product.sku,
                        previousStock = previousStock,
                        newStock = product.stockQuantity,
                        decrementedAmount = quantity
                    )
                )
                logger.info("Decremented stock for product $productId: $quantity units")
            }
        }

        return StockDecrementResult(
            success = true,
            message = "Stock decremented successfully",
            decrementedProducts = decrementedProducts
        )
    }

    /**
     * Calculate total price for a bundle
     */
    @Transactional(readOnly = true)
    fun calculateBundlePrice(bundleId: UUID): BigDecimal {
        val components = bundleComponentRepository.findByBundleIdOrderByPositionAsc(bundleId)

        return components.fold(BigDecimal.ZERO) { total, component ->
            val product = productRepository.findById(component.componentId).orElse(null)
            val price = component.specialPrice ?: product?.price ?: BigDecimal.ZERO
            total + (price * BigDecimal(component.quantity))
        }
    }

    /**
     * Get products that contain a specific product (as bundle component or grouped item)
     */
    @Transactional(readOnly = true)
    fun getProductUsage(productId: UUID): Map<String, List<UUID>> {
        val bundleUsage = bundleComponentRepository.findBundlesContainingProduct(productId)
            .map { it.bundleId }
            .distinct()

        val groupedUsage = groupedProductItemRepository.findGroupsContainingProduct(productId)
            .map { it.parentId }
            .distinct()

        return mapOf(
            "bundles" to bundleUsage,
            "groupedProducts" to groupedUsage
        )
    }
}
