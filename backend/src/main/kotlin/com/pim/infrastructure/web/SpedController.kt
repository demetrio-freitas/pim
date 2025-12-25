package com.pim.infrastructure.web

import com.pim.domain.product.SpedItemType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

/**
 * Controller para gerenciamento de dados relacionados ao SPED Fiscal
 *
 * Fornece endpoints para consulta dos tipos de item SPED utilizados
 * na classificação de produtos para fins fiscais (NF-e, SPED Fiscal).
 */
@RestController
@RequestMapping("/api/sped")
class SpedController {

    /**
     * Retorna todos os tipos de item SPED disponíveis
     *
     * Cada tipo contém:
     * - value: Identificador do enum (ex: MERCADORIA_REVENDA)
     * - code: Código SPED oficial (ex: "00")
     * - description: Descrição em português (ex: "Mercadoria para Revenda")
     */
    @GetMapping("/item-types")
    fun getItemTypes(): ResponseEntity<List<SpedItemTypeResponse>> {
        val types = SpedItemType.entries.map { type ->
            SpedItemTypeResponse(
                value = type.name,
                code = type.code,
                description = type.description
            )
        }
        return ResponseEntity.ok(types)
    }

    /**
     * Retorna um tipo de item SPED específico pelo código
     *
     * @param code Código SPED (00, 01, 02, etc.)
     */
    @GetMapping("/item-types/by-code/{code}")
    fun getItemTypeByCode(@PathVariable code: String): ResponseEntity<SpedItemTypeResponse> {
        val type = SpedItemType.fromCode(code)
            ?: return ResponseEntity.notFound().build()

        return ResponseEntity.ok(
            SpedItemTypeResponse(
                value = type.name,
                code = type.code,
                description = type.description
            )
        )
    }

    /**
     * Retorna um tipo de item SPED específico pelo nome do enum
     *
     * @param value Nome do enum (MERCADORIA_REVENDA, MATERIA_PRIMA, etc.)
     */
    @GetMapping("/item-types/{value}")
    fun getItemType(@PathVariable value: String): ResponseEntity<SpedItemTypeResponse> {
        val type = try {
            SpedItemType.valueOf(value)
        } catch (e: IllegalArgumentException) {
            return ResponseEntity.notFound().build()
        }

        return ResponseEntity.ok(
            SpedItemTypeResponse(
                value = type.name,
                code = type.code,
                description = type.description
            )
        )
    }

    /**
     * Retorna o tipo de item SPED padrão para produtos físicos
     */
    @GetMapping("/item-types/default/physical")
    fun getDefaultForPhysical(): ResponseEntity<SpedItemTypeResponse> {
        val type = SpedItemType.defaultForPhysicalProduct()
        return ResponseEntity.ok(
            SpedItemTypeResponse(
                value = type.name,
                code = type.code,
                description = type.description
            )
        )
    }

    /**
     * Retorna o tipo de item SPED padrão para produtos virtuais/serviços
     */
    @GetMapping("/item-types/default/virtual")
    fun getDefaultForVirtual(): ResponseEntity<SpedItemTypeResponse> {
        val type = SpedItemType.defaultForVirtualProduct()
        return ResponseEntity.ok(
            SpedItemTypeResponse(
                value = type.name,
                code = type.code,
                description = type.description
            )
        )
    }
}

/**
 * DTO de resposta para tipos de item SPED
 */
data class SpedItemTypeResponse(
    /** Identificador do enum (ex: MERCADORIA_REVENDA) */
    val value: String,
    /** Código SPED oficial (ex: "00") */
    val code: String,
    /** Descrição em português (ex: "Mercadoria para Revenda") */
    val description: String
)
