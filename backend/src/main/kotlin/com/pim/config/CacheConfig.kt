package com.pim.config

import com.fasterxml.jackson.annotation.JsonTypeInfo
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.jsontype.impl.LaissezFaireSubTypeValidator
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule
import com.fasterxml.jackson.module.kotlin.KotlinModule
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.cache.CacheManager
import org.springframework.cache.annotation.EnableCaching
import org.springframework.cache.concurrent.ConcurrentMapCacheManager
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Primary
import org.springframework.data.redis.cache.RedisCacheConfiguration
import org.springframework.data.redis.cache.RedisCacheManager
import org.springframework.data.redis.connection.RedisConnectionFactory
import org.springframework.data.redis.core.RedisTemplate
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer
import org.springframework.data.redis.serializer.RedisSerializationContext
import org.springframework.data.redis.serializer.StringRedisSerializer
import java.time.Duration

@Configuration
@EnableCaching
class CacheConfig {

    companion object {
        // Cache names
        const val PRODUCTS_CACHE = "products"
        const val PRODUCT_BY_ID_CACHE = "productById"
        const val PRODUCT_BY_SKU_CACHE = "productBySku"
        const val CATEGORIES_CACHE = "categories"
        const val CATEGORY_TREE_CACHE = "categoryTree"
        const val ATTRIBUTES_CACHE = "attributes"
        const val FAMILIES_CACHE = "families"
        const val CHANNELS_CACHE = "channels"
        const val QUALITY_RULES_CACHE = "qualityRules"
        const val DASHBOARD_STATS_CACHE = "dashboardStats"
        const val USER_BY_ID_CACHE = "userById"

        // TTL configurations
        val DEFAULT_TTL: Duration = Duration.ofMinutes(30)
        val SHORT_TTL: Duration = Duration.ofMinutes(5)
        val LONG_TTL: Duration = Duration.ofHours(2)
    }

    // ObjectMapper specifically for Redis cache (with type info for deserialization)
    @Bean("cacheObjectMapper")
    fun cacheObjectMapper(): ObjectMapper {
        return ObjectMapper().apply {
            registerModule(KotlinModule.Builder().build())
            registerModule(JavaTimeModule())
            activateDefaultTyping(
                LaissezFaireSubTypeValidator.instance,
                ObjectMapper.DefaultTyping.NON_FINAL,
                JsonTypeInfo.As.PROPERTY
            )
        }
    }

    @Bean
    @Primary
    @ConditionalOnProperty(name = ["spring.cache.type"], havingValue = "redis", matchIfMissing = false)
    fun redisCacheManager(
        connectionFactory: RedisConnectionFactory,
        @org.springframework.beans.factory.annotation.Qualifier("cacheObjectMapper") cacheObjectMapper: ObjectMapper
    ): CacheManager {
        val serializer = GenericJackson2JsonRedisSerializer(cacheObjectMapper)

        val defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(DEFAULT_TTL)
            .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(StringRedisSerializer()))
            .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(serializer))
            .disableCachingNullValues()

        val cacheConfigurations = mapOf(
            // Short TTL for frequently changing data
            DASHBOARD_STATS_CACHE to defaultConfig.entryTtl(SHORT_TTL),
            PRODUCTS_CACHE to defaultConfig.entryTtl(SHORT_TTL),

            // Default TTL
            PRODUCT_BY_ID_CACHE to defaultConfig,
            PRODUCT_BY_SKU_CACHE to defaultConfig,
            CATEGORIES_CACHE to defaultConfig,
            ATTRIBUTES_CACHE to defaultConfig,
            USER_BY_ID_CACHE to defaultConfig,

            // Long TTL for rarely changing data
            CATEGORY_TREE_CACHE to defaultConfig.entryTtl(LONG_TTL),
            FAMILIES_CACHE to defaultConfig.entryTtl(LONG_TTL),
            CHANNELS_CACHE to defaultConfig.entryTtl(LONG_TTL),
            QUALITY_RULES_CACHE to defaultConfig.entryTtl(LONG_TTL)
        )

        return RedisCacheManager.builder(connectionFactory)
            .cacheDefaults(defaultConfig)
            .withInitialCacheConfigurations(cacheConfigurations)
            .transactionAware()
            .build()
    }

    @Bean
    @ConditionalOnProperty(name = ["spring.cache.type"], havingValue = "redis", matchIfMissing = false)
    fun redisTemplate(
        connectionFactory: RedisConnectionFactory,
        @org.springframework.beans.factory.annotation.Qualifier("cacheObjectMapper") cacheObjectMapper: ObjectMapper
    ): RedisTemplate<String, Any> {
        return RedisTemplate<String, Any>().apply {
            setConnectionFactory(connectionFactory)
            keySerializer = StringRedisSerializer()
            valueSerializer = GenericJackson2JsonRedisSerializer(cacheObjectMapper)
            hashKeySerializer = StringRedisSerializer()
            hashValueSerializer = GenericJackson2JsonRedisSerializer(cacheObjectMapper)
            afterPropertiesSet()
        }
    }

    // Fallback in-memory cache when Redis is not available
    @Bean
    @ConditionalOnProperty(name = ["spring.cache.type"], havingValue = "simple", matchIfMissing = true)
    fun simpleCacheManager(): CacheManager {
        return ConcurrentMapCacheManager(
            PRODUCTS_CACHE,
            PRODUCT_BY_ID_CACHE,
            PRODUCT_BY_SKU_CACHE,
            CATEGORIES_CACHE,
            CATEGORY_TREE_CACHE,
            ATTRIBUTES_CACHE,
            FAMILIES_CACHE,
            CHANNELS_CACHE,
            QUALITY_RULES_CACHE,
            DASHBOARD_STATS_CACHE,
            USER_BY_ID_CACHE
        )
    }
}
