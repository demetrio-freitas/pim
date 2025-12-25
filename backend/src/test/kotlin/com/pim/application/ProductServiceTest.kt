package com.pim.application

import com.pim.domain.product.Product
import com.pim.domain.product.ProductStatus
import com.pim.domain.product.ProductType
import com.pim.domain.shared.ProductNotFoundException
import com.pim.domain.shared.ProductAlreadyExistsException
import com.pim.infrastructure.persistence.ProductRepository
import com.pim.infrastructure.persistence.CategoryRepository
import io.mockk.*
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.MockK
import io.mockk.junit5.MockKExtension
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import java.util.*
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull

@ExtendWith(MockKExtension::class)
class ProductServiceTest {

    @MockK
    lateinit var productRepository: ProductRepository

    @MockK
    lateinit var categoryRepository: CategoryRepository

    @InjectMockKs
    lateinit var productService: ProductService

    private lateinit var testProduct: Product

    @BeforeEach
    fun setup() {
        testProduct = Product(
            id = UUID.randomUUID(),
            sku = "TEST-001",
            name = "Test Product",
            description = "Test Description",
            type = ProductType.SIMPLE,
            status = ProductStatus.DRAFT
        )
    }

    @Test
    fun `findById should return product when found`() {
        // Given
        val productId = testProduct.id
        every { productRepository.findByIdWithRelations(productId) } returns testProduct

        // When
        val result = productService.findById(productId)

        // Then
        assertNotNull(result)
        assertEquals(testProduct.sku, result.sku)
        verify(exactly = 1) { productRepository.findByIdWithRelations(productId) }
    }

    @Test
    fun `findById should return null when not found`() {
        // Given
        val productId = UUID.randomUUID()
        every { productRepository.findByIdWithRelations(productId) } returns null

        // When
        val result = productService.findById(productId)

        // Then
        assertNull(result)
        verify(exactly = 1) { productRepository.findByIdWithRelations(productId) }
    }

    @Test
    fun `findBySku should return product when found`() {
        // Given
        val sku = "TEST-001"
        every { productRepository.findBySku(sku) } returns testProduct

        // When
        val result = productService.findBySku(sku)

        // Then
        assertNotNull(result)
        assertEquals(sku, result.sku)
        verify(exactly = 1) { productRepository.findBySku(sku) }
    }

    @Test
    fun `create should save product when SKU is unique`() {
        // Given
        every { productRepository.existsBySku(testProduct.sku) } returns false
        every { productRepository.save(any()) } returns testProduct

        // When
        val result = productService.create(testProduct)

        // Then
        assertNotNull(result)
        assertEquals(testProduct.sku, result.sku)
        verify(exactly = 1) { productRepository.existsBySku(testProduct.sku) }
        verify(exactly = 1) { productRepository.save(any()) }
    }

    @Test
    fun `create should throw ProductAlreadyExistsException when SKU already exists`() {
        // Given
        every { productRepository.existsBySku(testProduct.sku) } returns true

        // When & Then
        val exception = assertThrows<ProductAlreadyExistsException> {
            productService.create(testProduct)
        }
        assertEquals("PRODUCT_DUPLICATE_SKU", exception.errorCode)
        verify(exactly = 1) { productRepository.existsBySku(testProduct.sku) }
        verify(exactly = 0) { productRepository.save(any()) }
    }

    @Test
    fun `update should modify and save product`() {
        // Given
        val productId = testProduct.id
        every { productRepository.findById(productId) } returns Optional.of(testProduct)
        every { productRepository.save(any()) } answers { firstArg() }

        // When
        val result = productService.update(productId) { product ->
            product.name = "Updated Name"
        }

        // Then
        assertEquals("Updated Name", result.name)
        verify(exactly = 1) { productRepository.findById(productId) }
        verify(exactly = 1) { productRepository.save(any()) }
    }

    @Test
    fun `update should throw ProductNotFoundException when product not found`() {
        // Given
        val productId = UUID.randomUUID()
        every { productRepository.findById(productId) } returns Optional.empty()

        // When & Then
        val exception = assertThrows<ProductNotFoundException> {
            productService.update(productId) { }
        }
        assertEquals("PRODUCT_NOT_FOUND", exception.errorCode)
        verify(exactly = 1) { productRepository.findById(productId) }
        verify(exactly = 0) { productRepository.save(any()) }
    }

    @Test
    fun `updateStatus should change product status`() {
        // Given
        val productId = testProduct.id
        every { productRepository.findById(productId) } returns Optional.of(testProduct)
        every { productRepository.save(any()) } answers { firstArg() }

        // When
        val result = productService.updateStatus(productId, ProductStatus.PUBLISHED)

        // Then
        assertEquals(ProductStatus.PUBLISHED, result.status)
        verify(exactly = 1) { productRepository.save(any()) }
    }

    @Test
    fun `delete should remove product when found`() {
        // Given
        val productId = testProduct.id
        every { productRepository.existsById(productId) } returns true
        every { productRepository.deleteById(productId) } just runs

        // When
        productService.delete(productId)

        // Then
        verify(exactly = 1) { productRepository.existsById(productId) }
        verify(exactly = 1) { productRepository.deleteById(productId) }
    }

    @Test
    fun `delete should throw ProductNotFoundException when product not found`() {
        // Given
        val productId = UUID.randomUUID()
        every { productRepository.existsById(productId) } returns false

        // When & Then
        val exception = assertThrows<ProductNotFoundException> {
            productService.delete(productId)
        }
        assertEquals("PRODUCT_NOT_FOUND", exception.errorCode)
        verify(exactly = 1) { productRepository.existsById(productId) }
        verify(exactly = 0) { productRepository.deleteById(any()) }
    }

    @Test
    fun `getStatistics should return correct counts`() {
        // Given
        every { productRepository.count() } returns 100
        every { productRepository.countByStatus(ProductStatus.DRAFT) } returns 20
        every { productRepository.countByStatus(ProductStatus.PENDING_REVIEW) } returns 15
        every { productRepository.countByStatus(ProductStatus.APPROVED) } returns 25
        every { productRepository.countByStatus(ProductStatus.PUBLISHED) } returns 30
        every { productRepository.countByStatus(ProductStatus.ARCHIVED) } returns 10

        // When
        val stats = productService.getStatistics()

        // Then
        assertEquals(100, stats.total)
        assertEquals(20, stats.draft)
        assertEquals(15, stats.pendingReview)
        assertEquals(25, stats.approved)
        assertEquals(30, stats.published)
        assertEquals(10, stats.archived)
    }

    @Test
    fun `bulkUpdateStatus should update multiple products`() {
        // Given
        val product1 = testProduct.copy(id = UUID.randomUUID())
        val product2 = testProduct.copy(id = UUID.randomUUID())
        val ids = listOf(product1.id, product2.id)

        every { productRepository.findById(product1.id) } returns Optional.of(product1)
        every { productRepository.findById(product2.id) } returns Optional.of(product2)
        every { productRepository.save(any()) } answers { firstArg() }

        // When
        val updated = productService.bulkUpdateStatus(ids, ProductStatus.APPROVED)

        // Then
        assertEquals(2, updated)
        verify(exactly = 2) { productRepository.save(any()) }
    }

    @Test
    fun `bulkUpdateStatus should continue on error and return partial count`() {
        // Given
        val product1 = testProduct.copy(id = UUID.randomUUID())
        val nonExistentId = UUID.randomUUID()
        val ids = listOf(product1.id, nonExistentId)

        every { productRepository.findById(product1.id) } returns Optional.of(product1)
        every { productRepository.findById(nonExistentId) } returns Optional.empty()
        every { productRepository.save(any()) } answers { firstArg() }

        // When
        val updated = productService.bulkUpdateStatus(ids, ProductStatus.APPROVED)

        // Then
        assertEquals(1, updated)
    }
}
