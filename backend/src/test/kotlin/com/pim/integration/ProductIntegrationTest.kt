package com.pim.integration

import com.pim.domain.product.Product
import com.pim.domain.product.ProductStatus
import com.pim.domain.product.ProductType
import com.pim.infrastructure.persistence.ProductRepository
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.security.test.context.support.WithMockUser
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import java.util.*

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
class ProductIntegrationTest {

    companion object {
        @Container
        val postgres = PostgreSQLContainer<Nothing>("postgres:16-alpine").apply {
            withDatabaseName("pim_test")
            withUsername("test")
            withPassword("test")
        }

        @JvmStatic
        @DynamicPropertySource
        fun configureProperties(registry: DynamicPropertyRegistry) {
            registry.add("spring.datasource.url") { postgres.jdbcUrl }
            registry.add("spring.datasource.username") { postgres.username }
            registry.add("spring.datasource.password") { postgres.password }
        }
    }

    @Autowired
    lateinit var mockMvc: MockMvc

    @Autowired
    lateinit var productRepository: ProductRepository

    @BeforeEach
    fun setup() {
        productRepository.deleteAll()
    }

    @Test
    @WithMockUser(roles = ["ADMIN"])
    fun `should create product`() {
        val productJson = """
            {
                "sku": "INT-TEST-001",
                "name": "Integration Test Product",
                "description": "Test description",
                "type": "SIMPLE",
                "status": "DRAFT"
            }
        """.trimIndent()

        mockMvc.perform(
            post("/api/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content(productJson)
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.sku").value("INT-TEST-001"))
            .andExpect(jsonPath("$.name").value("Integration Test Product"))
    }

    @Test
    @WithMockUser(roles = ["ADMIN"])
    fun `should get product by id`() {
        // Given
        val product = productRepository.save(
            Product(
                sku = "GET-TEST-001",
                name = "Get Test Product",
                type = ProductType.SIMPLE
            )
        )

        // When & Then
        mockMvc.perform(get("/api/products/${product.id}"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.id").value(product.id.toString()))
            .andExpect(jsonPath("$.sku").value("GET-TEST-001"))
    }

    @Test
    @WithMockUser(roles = ["ADMIN"])
    fun `should return 404 for non-existent product`() {
        val nonExistentId = UUID.randomUUID()

        mockMvc.perform(get("/api/products/$nonExistentId"))
            .andExpect(status().isNotFound)
            .andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"))
    }

    @Test
    @WithMockUser(roles = ["ADMIN"])
    fun `should update product`() {
        // Given
        val product = productRepository.save(
            Product(
                sku = "UPD-TEST-001",
                name = "Original Name",
                type = ProductType.SIMPLE
            )
        )

        val updateJson = """
            {
                "name": "Updated Name",
                "description": "Updated description"
            }
        """.trimIndent()

        // When & Then
        mockMvc.perform(
            put("/api/products/${product.id}")
                .contentType(MediaType.APPLICATION_JSON)
                .content(updateJson)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.name").value("Updated Name"))
            .andExpect(jsonPath("$.description").value("Updated description"))
    }

    @Test
    @WithMockUser(roles = ["ADMIN"])
    fun `should delete product`() {
        // Given
        val product = productRepository.save(
            Product(
                sku = "DEL-TEST-001",
                name = "To Delete",
                type = ProductType.SIMPLE
            )
        )

        // When & Then
        mockMvc.perform(delete("/api/products/${product.id}"))
            .andExpect(status().isNoContent)

        // Verify deleted
        mockMvc.perform(get("/api/products/${product.id}"))
            .andExpect(status().isNotFound)
    }

    @Test
    @WithMockUser(roles = ["ADMIN"])
    fun `should list products with pagination`() {
        // Given
        repeat(15) { i ->
            productRepository.save(
                Product(
                    sku = "LIST-TEST-${String.format("%03d", i)}",
                    name = "List Test Product $i",
                    type = ProductType.SIMPLE
                )
            )
        }

        // When & Then
        mockMvc.perform(
            get("/api/products")
                .param("page", "0")
                .param("size", "10")
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.content.length()").value(10))
            .andExpect(jsonPath("$.totalElements").value(15))
            .andExpect(jsonPath("$.totalPages").value(2))
    }

    @Test
    @WithMockUser(roles = ["ADMIN"])
    fun `should return conflict for duplicate SKU`() {
        // Given
        productRepository.save(
            Product(
                sku = "DUP-TEST-001",
                name = "First Product",
                type = ProductType.SIMPLE
            )
        )

        val duplicateJson = """
            {
                "sku": "DUP-TEST-001",
                "name": "Duplicate Product",
                "type": "SIMPLE"
            }
        """.trimIndent()

        // When & Then
        mockMvc.perform(
            post("/api/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content(duplicateJson)
        )
            .andExpect(status().isConflict)
            .andExpect(jsonPath("$.errorCode").value("PRODUCT_DUPLICATE_SKU"))
    }

    @Test
    @WithMockUser(roles = ["ADMIN"])
    fun `should update product status`() {
        // Given
        val product = productRepository.save(
            Product(
                sku = "STATUS-TEST-001",
                name = "Status Test",
                type = ProductType.SIMPLE,
                status = ProductStatus.DRAFT
            )
        )

        val statusJson = """{"status": "PUBLISHED"}"""

        // When & Then
        mockMvc.perform(
            patch("/api/products/${product.id}/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content(statusJson)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.status").value("PUBLISHED"))
    }

    @Test
    @WithMockUser(roles = ["ADMIN"])
    fun `should search products`() {
        // Given
        productRepository.save(
            Product(
                sku = "SEARCH-001",
                name = "Smartphone Samsung Galaxy",
                type = ProductType.SIMPLE
            )
        )
        productRepository.save(
            Product(
                sku = "SEARCH-002",
                name = "iPhone Apple",
                type = ProductType.SIMPLE
            )
        )

        // When & Then
        mockMvc.perform(
            get("/api/products")
                .param("search", "Samsung")
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.content.length()").value(1))
            .andExpect(jsonPath("$.content[0].name").value("Smartphone Samsung Galaxy"))
    }

    @Test
    fun `should require authentication`() {
        mockMvc.perform(get("/api/products"))
            .andExpect(status().isUnauthorized)
    }

    @Test
    @WithMockUser(roles = ["VIEWER"])
    fun `should allow viewer to read products`() {
        mockMvc.perform(get("/api/products"))
            .andExpect(status().isOk)
    }
}
