package com.pim.domain.channel

import jakarta.persistence.*
import java.time.Instant
import java.util.*

enum class ChannelType {
    ECOMMERCE,      // Loja virtual própria
    MARKETPLACE,    // Mercado Livre, Amazon, etc
    CATALOG,        // Catálogo impresso/PDF
    MOBILE_APP,     // Aplicativo móvel
    POS,            // Ponto de venda físico
    B2B,            // Portal B2B
    SOCIAL,         // Facebook Shop, Instagram, etc
    CUSTOM          // Personalizado
}

enum class ChannelStatus {
    ACTIVE,
    INACTIVE,
    MAINTENANCE
}

@Entity
@Table(name = "channels")
data class Channel(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(nullable = false, unique = true)
    var code: String,

    @Column(nullable = false)
    var name: String,

    var description: String? = null,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var type: ChannelType = ChannelType.ECOMMERCE,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: ChannelStatus = ChannelStatus.ACTIVE,

    // Configurações do canal
    @Column(columnDefinition = "TEXT")
    var settings: String? = null, // JSON com configurações específicas

    // Moeda padrão do canal
    var currency: String = "BRL",

    // Locale padrão do canal
    var locale: String = "pt_BR",

    // URL do canal (se aplicável)
    var url: String? = null,

    // Logo/ícone do canal
    var logoUrl: String? = null,

    // Cor do canal para identificação visual
    var color: String? = null,

    // Atributos obrigatórios para este canal
    @ElementCollection
    @CollectionTable(name = "channel_required_attributes", joinColumns = [JoinColumn(name = "channel_id")])
    @Column(name = "attribute_code")
    var requiredAttributes: MutableSet<String> = mutableSetOf(),

    // Categorias disponíveis neste canal (null = todas)
    @ElementCollection
    @CollectionTable(name = "channel_categories", joinColumns = [JoinColumn(name = "channel_id")])
    @Column(name = "category_id")
    var allowedCategoryIds: MutableSet<UUID> = mutableSetOf(),

    // Ordenação/prioridade
    var position: Int = 0,

    // Metadados
    val createdAt: Instant = Instant.now(),
    var updatedAt: Instant = Instant.now(),
    var createdBy: UUID? = null
) {
    @PreUpdate
    fun onUpdate() {
        updatedAt = Instant.now()
    }
}

/**
 * Associação entre Produto e Canal
 * Define como um produto está configurado para cada canal
 */
@Entity
@Table(
    name = "product_channels",
    uniqueConstraints = [UniqueConstraint(columnNames = ["product_id", "channel_id"])]
)
data class ProductChannel(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(name = "product_id", nullable = false)
    val productId: UUID,

    @Column(name = "channel_id", nullable = false)
    val channelId: UUID,

    // Status no canal
    var enabled: Boolean = true,

    // Publicado no canal?
    var published: Boolean = false,

    // Data de publicação
    var publishedAt: Instant? = null,

    // Valores específicos do canal (preço, título, etc)
    @Column(columnDefinition = "TEXT")
    var channelValues: String? = null, // JSON com valores específicos

    // Score de completude para este canal
    var completenessScore: Int = 0,

    // Erros de validação para este canal
    @Column(columnDefinition = "TEXT")
    var validationErrors: String? = null, // JSON com erros

    // Metadados
    val createdAt: Instant = Instant.now(),
    var updatedAt: Instant = Instant.now()
) {
    @PreUpdate
    fun onUpdate() {
        updatedAt = Instant.now()
    }
}

/**
 * Histórico de publicações no canal
 */
@Entity
@Table(name = "channel_publication_logs")
data class ChannelPublicationLog(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(name = "product_id", nullable = false)
    val productId: UUID,

    @Column(name = "channel_id", nullable = false)
    val channelId: UUID,

    // Tipo de ação
    @Enumerated(EnumType.STRING)
    val action: PublicationAction,

    // Sucesso?
    val success: Boolean,

    // Mensagem de erro (se houver)
    @Column(columnDefinition = "TEXT")
    var errorMessage: String? = null,

    // Snapshot dos dados publicados
    @Column(columnDefinition = "TEXT")
    var dataSnapshot: String? = null,

    // Usuário que fez a ação
    var userId: UUID? = null,

    val createdAt: Instant = Instant.now()
)

enum class PublicationAction {
    PUBLISH,
    UNPUBLISH,
    UPDATE,
    SYNC
}
