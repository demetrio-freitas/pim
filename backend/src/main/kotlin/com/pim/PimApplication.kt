package com.pim

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.autoconfigure.data.elasticsearch.ElasticsearchDataAutoConfiguration
import org.springframework.boot.autoconfigure.data.elasticsearch.ElasticsearchRepositoriesAutoConfiguration
import org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration
import org.springframework.boot.autoconfigure.data.redis.RedisReactiveAutoConfiguration
import org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration
import org.springframework.boot.autoconfigure.elasticsearch.ElasticsearchClientAutoConfiguration
import org.springframework.boot.runApplication
import org.springframework.data.jpa.repository.config.EnableJpaAuditing

@SpringBootApplication(exclude = [
    ElasticsearchDataAutoConfiguration::class,
    ElasticsearchRepositoriesAutoConfiguration::class,
    ElasticsearchClientAutoConfiguration::class,
    RedisAutoConfiguration::class,
    RedisReactiveAutoConfiguration::class,
    RedisRepositoriesAutoConfiguration::class
])
@EnableJpaAuditing
class PimApplication

fun main(args: Array<String>) {
    runApplication<PimApplication>(*args)
}
