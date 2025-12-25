package com.pim.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Configuration
import org.springframework.data.elasticsearch.client.ClientConfiguration
import org.springframework.data.elasticsearch.client.elc.ElasticsearchConfiguration
import org.springframework.data.elasticsearch.repository.config.EnableElasticsearchRepositories

@Configuration
@ConditionalOnProperty(value = ["elasticsearch.enabled"], havingValue = "true", matchIfMissing = false)
@EnableElasticsearchRepositories(basePackages = ["com.pim.infrastructure.search"])
class ElasticsearchConfig : ElasticsearchConfiguration() {

    @Value("\${elasticsearch.host:localhost}")
    private lateinit var host: String

    @Value("\${elasticsearch.port:9200}")
    private var port: Int = 9200

    @Value("\${elasticsearch.username:}")
    private lateinit var username: String

    @Value("\${elasticsearch.password:}")
    private lateinit var password: String

    override fun clientConfiguration(): ClientConfiguration {
        val builder = ClientConfiguration.builder()
            .connectedTo("$host:$port")
            .withConnectTimeout(5000)
            .withSocketTimeout(30000)

        if (username.isNotBlank() && password.isNotBlank()) {
            builder.withBasicAuth(username, password)
        }

        return builder.build()
    }
}
