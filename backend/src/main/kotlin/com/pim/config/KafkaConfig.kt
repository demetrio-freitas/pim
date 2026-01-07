package com.pim.config

import com.fasterxml.jackson.databind.ObjectMapper
import org.apache.kafka.clients.admin.NewTopic
import org.apache.kafka.clients.consumer.ConsumerConfig
import org.apache.kafka.clients.producer.ProducerConfig
import org.apache.kafka.common.serialization.StringDeserializer
import org.apache.kafka.common.serialization.StringSerializer
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory
import org.springframework.kafka.config.TopicBuilder
import org.springframework.kafka.core.*
import org.springframework.kafka.listener.ContainerProperties
import org.springframework.kafka.support.serializer.ErrorHandlingDeserializer
import org.springframework.kafka.support.serializer.JsonDeserializer
import org.springframework.kafka.support.serializer.JsonSerializer

@Configuration
@ConditionalOnProperty(value = ["kafka.enabled"], havingValue = "true", matchIfMissing = false)
class KafkaConfig {

    @Value("\${spring.kafka.bootstrap-servers:localhost:9092}")
    private lateinit var bootstrapServers: String

    @Value("\${spring.kafka.consumer.group-id:pim-group}")
    private lateinit var groupId: String

    @Value("\${kafka.listener-concurrency:3}")
    private var listenerConcurrency: Int = 3

    companion object {
        const val PRODUCT_EVENTS_TOPIC = "pim.product.events"
        const val CATEGORY_EVENTS_TOPIC = "pim.category.events"
        const val IMPORT_EVENTS_TOPIC = "pim.import.events"
        const val QUALITY_EVENTS_TOPIC = "pim.quality.events"
        const val DEAD_LETTER_TOPIC = "pim.dead-letter"
    }

    // ============================================
    // Topics
    // ============================================

    @Bean
    fun productEventsTopic(): NewTopic = TopicBuilder
        .name(PRODUCT_EVENTS_TOPIC)
        .partitions(6)
        .replicas(1)
        .config("retention.ms", "604800000") // 7 days
        .build()

    @Bean
    fun categoryEventsTopic(): NewTopic = TopicBuilder
        .name(CATEGORY_EVENTS_TOPIC)
        .partitions(3)
        .replicas(1)
        .config("retention.ms", "604800000")
        .build()

    @Bean
    fun importEventsTopic(): NewTopic = TopicBuilder
        .name(IMPORT_EVENTS_TOPIC)
        .partitions(3)
        .replicas(1)
        .config("retention.ms", "604800000")
        .build()

    @Bean
    fun qualityEventsTopic(): NewTopic = TopicBuilder
        .name(QUALITY_EVENTS_TOPIC)
        .partitions(3)
        .replicas(1)
        .config("retention.ms", "604800000")
        .build()

    @Bean
    fun deadLetterTopic(): NewTopic = TopicBuilder
        .name(DEAD_LETTER_TOPIC)
        .partitions(1)
        .replicas(1)
        .config("retention.ms", "2592000000") // 30 days
        .build()

    // ============================================
    // Producer Configuration
    // ============================================

    @Bean
    fun producerFactory(objectMapper: ObjectMapper): ProducerFactory<String, Any> {
        val configProps = mapOf(
            ProducerConfig.BOOTSTRAP_SERVERS_CONFIG to bootstrapServers,
            ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG to StringSerializer::class.java,
            ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG to JsonSerializer::class.java,
            ProducerConfig.ACKS_CONFIG to "all",
            ProducerConfig.RETRIES_CONFIG to 3,
            ProducerConfig.RETRY_BACKOFF_MS_CONFIG to 1000,
            ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG to true,
            ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION to 1
        )
        return DefaultKafkaProducerFactory(configProps)
    }

    @Bean
    fun kafkaTemplate(producerFactory: ProducerFactory<String, Any>): KafkaTemplate<String, Any> {
        return KafkaTemplate(producerFactory)
    }

    // ============================================
    // Consumer Configuration
    // ============================================

    @Bean
    fun consumerFactory(objectMapper: ObjectMapper): ConsumerFactory<String, Any> {
        val configProps = mapOf(
            ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG to bootstrapServers,
            ConsumerConfig.GROUP_ID_CONFIG to groupId,
            ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG to ErrorHandlingDeserializer::class.java,
            ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG to ErrorHandlingDeserializer::class.java,
            ErrorHandlingDeserializer.KEY_DESERIALIZER_CLASS to StringDeserializer::class.java,
            ErrorHandlingDeserializer.VALUE_DESERIALIZER_CLASS to JsonDeserializer::class.java,
            JsonDeserializer.TRUSTED_PACKAGES to "com.pim.domain.event,com.pim.infrastructure.messaging",
            ConsumerConfig.AUTO_OFFSET_RESET_CONFIG to "earliest",
            ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG to false,
            ConsumerConfig.MAX_POLL_RECORDS_CONFIG to 100
        )
        return DefaultKafkaConsumerFactory(configProps)
    }

    @Bean
    fun kafkaListenerContainerFactory(
        consumerFactory: ConsumerFactory<String, Any>
    ): ConcurrentKafkaListenerContainerFactory<String, Any> {
        val factory = ConcurrentKafkaListenerContainerFactory<String, Any>()
        factory.consumerFactory = consumerFactory
        factory.containerProperties.ackMode = ContainerProperties.AckMode.MANUAL_IMMEDIATE
        factory.setConcurrency(listenerConcurrency)
        factory.setCommonErrorHandler(KafkaErrorHandler())
        return factory
    }
}

/**
 * Custom error handler for Kafka consumers
 */
class KafkaErrorHandler : org.springframework.kafka.listener.DefaultErrorHandler() {
    private val logger = org.slf4j.LoggerFactory.getLogger(javaClass)

    override fun handleRemaining(
        thrownException: Exception,
        records: MutableList<org.apache.kafka.clients.consumer.ConsumerRecord<*, *>>,
        consumer: org.apache.kafka.clients.consumer.Consumer<*, *>,
        container: org.springframework.kafka.listener.MessageListenerContainer
    ) {
        logger.error("Error processing Kafka records: ${thrownException.message}", thrownException)
        records.forEach { record ->
            logger.error("Failed record - Topic: ${record.topic()}, Partition: ${record.partition()}, Offset: ${record.offset()}")
        }
        super.handleRemaining(thrownException, records, consumer, container)
    }
}
