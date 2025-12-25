package com.pim.infrastructure.search

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.elasticsearch.annotations.Query
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository

interface ProductSearchRepository : ElasticsearchRepository<ProductDocument, String> {

    fun findByStatus(status: String, pageable: Pageable): Page<ProductDocument>

    fun findByType(type: String, pageable: Pageable): Page<ProductDocument>

    fun findBySku(sku: String): ProductDocument?

    fun findByBrand(brand: String, pageable: Pageable): Page<ProductDocument>

    fun findByCategoriesContaining(categoryId: String, pageable: Pageable): Page<ProductDocument>

    fun findByIsInStock(inStock: Boolean, pageable: Pageable): Page<ProductDocument>

    fun findByStatusAndIsInStock(status: String, inStock: Boolean, pageable: Pageable): Page<ProductDocument>

    fun findByPriceBetween(minPrice: Double, maxPrice: Double, pageable: Pageable): Page<ProductDocument>

    fun findByCompletenessScoreGreaterThanEqual(minScore: Int, pageable: Pageable): Page<ProductDocument>

    @Query("""
        {
            "bool": {
                "should": [
                    { "match": { "name": { "query": "?0", "boost": 3 } } },
                    { "match": { "sku": { "query": "?0", "boost": 2 } } },
                    { "match": { "description": { "query": "?0", "boost": 1 } } },
                    { "match": { "searchText": { "query": "?0" } } }
                ],
                "minimum_should_match": 1
            }
        }
    """)
    fun searchByText(text: String, pageable: Pageable): Page<ProductDocument>
}
