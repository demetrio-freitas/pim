package com.pim.domain.product

import com.pim.domain.attribute.Attribute
import jakarta.persistence.*
import java.util.*

@Entity
@Table(name = "product_attributes")
data class ProductAttribute(
    @Id
    val id: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    var product: Product? = null,

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "attribute_id", nullable = false)
    var attribute: Attribute,

    @Column(columnDefinition = "TEXT")
    var textValue: String? = null,

    var numberValue: Double? = null,

    var booleanValue: Boolean? = null,

    @Column(columnDefinition = "TEXT")
    var jsonValue: String? = null,

    @Column(name = "locale")
    var locale: String? = null,

    @Column(name = "channel")
    var channel: String? = null
) {
    fun getValue(): Any? {
        return when (attribute.type) {
            AttributeType.TEXT, AttributeType.TEXTAREA, AttributeType.RICHTEXT -> textValue
            AttributeType.NUMBER, AttributeType.DECIMAL, AttributeType.PRICE -> numberValue
            AttributeType.BOOLEAN -> booleanValue
            AttributeType.SELECT, AttributeType.MULTISELECT, AttributeType.DATE, AttributeType.DATETIME -> textValue
            AttributeType.JSON -> jsonValue
            AttributeType.IMAGE, AttributeType.FILE -> textValue
        }
    }

    fun setValue(value: Any?) {
        when (attribute.type) {
            AttributeType.TEXT, AttributeType.TEXTAREA, AttributeType.RICHTEXT -> textValue = value?.toString()
            AttributeType.NUMBER, AttributeType.DECIMAL, AttributeType.PRICE -> numberValue = (value as? Number)?.toDouble()
            AttributeType.BOOLEAN -> booleanValue = value as? Boolean
            AttributeType.SELECT, AttributeType.MULTISELECT, AttributeType.DATE, AttributeType.DATETIME -> textValue = value?.toString()
            AttributeType.JSON -> jsonValue = value?.toString()
            AttributeType.IMAGE, AttributeType.FILE -> textValue = value?.toString()
        }
    }
}

enum class AttributeType {
    TEXT,
    TEXTAREA,
    RICHTEXT,
    NUMBER,
    DECIMAL,
    PRICE,
    BOOLEAN,
    SELECT,
    MULTISELECT,
    DATE,
    DATETIME,
    IMAGE,
    FILE,
    JSON
}
