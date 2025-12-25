package com.pim.infrastructure.search

import com.pim.domain.product.Product
import com.pim.domain.product.ProductStatus
import com.pim.domain.product.ProductType
import org.springframework.data.annotation.Id
import org.springframework.data.elasticsearch.annotations.*
import java.math.BigDecimal
import java.time.Instant

@Document(indexName = "products")
@Setting(
    shards = 1,
    replicas = 0,
    refreshInterval = "1s"
)
data class ProductDocument(
    @Id
    val id: String,

    @Field(type = FieldType.Keyword)
    val sku: String,

    @MultiField(
        mainField = Field(type = FieldType.Text, analyzer = "standard"),
        otherFields = [
            InnerField(suffix = "keyword", type = FieldType.Keyword),
            InnerField(suffix = "autocomplete", type = FieldType.Text, analyzer = "autocomplete")
        ]
    )
    val name: String,

    @Field(type = FieldType.Text, analyzer = "standard")
    val description: String? = null,

    @Field(type = FieldType.Text, analyzer = "standard")
    val shortDescription: String? = null,

    @Field(type = FieldType.Double)
    val price: Double? = null,

    @Field(type = FieldType.Keyword)
    val status: String,

    @Field(type = FieldType.Keyword)
    val type: String,

    @Field(type = FieldType.Keyword)
    val brand: String? = null,

    @Field(type = FieldType.Keyword)
    val manufacturer: String? = null,

    @Field(type = FieldType.Keyword)
    val categories: List<String> = emptyList(),

    @Field(type = FieldType.Keyword)
    val categoryNames: List<String> = emptyList(),

    @Field(type = FieldType.Nested)
    val attributes: List<AttributeValue> = emptyList(),

    @Field(type = FieldType.Integer)
    val stockQuantity: Int = 0,

    @Field(type = FieldType.Boolean)
    val isInStock: Boolean = true,

    @Field(type = FieldType.Integer)
    val completenessScore: Int = 0,

    @Field(type = FieldType.Text)
    val metaKeywords: String? = null,

    @Field(type = FieldType.Date, format = [DateFormat.date_hour_minute_second_millis, DateFormat.epoch_millis])
    val createdAt: Instant,

    @Field(type = FieldType.Date, format = [DateFormat.date_hour_minute_second_millis, DateFormat.epoch_millis])
    val updatedAt: Instant,

    @Field(type = FieldType.Text, analyzer = "standard")
    val searchText: String? = null
) {
    companion object {
        fun fromProduct(product: Product): ProductDocument {
            val categoryIds = product.categories.map { it.id.toString() }
            val categoryNames = product.categories.map { it.name }

            val attributeValues = product.attributes.map { productAttr ->
                val attrDef = productAttr.attribute
                AttributeValue(
                    code = attrDef.code,
                    name = attrDef.name,
                    attrValue = productAttr.getValue()?.toString() ?: "",
                    type = attrDef.type.name
                )
            }

            val searchParts = listOfNotNull(
                product.sku,
                product.name,
                product.description,
                product.shortDescription,
                product.brand,
                product.manufacturer,
                product.metaKeywords
            ) + categoryNames + attributeValues.map { it.attrValue }

            return ProductDocument(
                id = product.id.toString(),
                sku = product.sku,
                name = product.name,
                description = product.description,
                shortDescription = product.shortDescription,
                price = product.price?.toDouble(),
                status = product.status.name,
                type = product.type.name,
                brand = product.brand,
                manufacturer = product.manufacturer,
                categories = categoryIds,
                categoryNames = categoryNames,
                attributes = attributeValues,
                stockQuantity = product.stockQuantity,
                isInStock = product.isInStock,
                completenessScore = product.completenessScore,
                metaKeywords = product.metaKeywords,
                createdAt = product.createdAt,
                updatedAt = product.updatedAt,
                searchText = searchParts.joinToString(" ")
            )
        }
    }
}

data class AttributeValue(
    @Field(type = FieldType.Keyword)
    val code: String,

    @Field(type = FieldType.Keyword)
    val name: String,

    @Field(type = FieldType.Text)
    val attrValue: String,

    @Field(type = FieldType.Keyword)
    val type: String
)
