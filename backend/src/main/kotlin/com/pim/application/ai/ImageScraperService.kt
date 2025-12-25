package com.pim.application.ai

import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate
import org.springframework.http.*
import java.net.URL
import java.util.regex.Pattern

data class ScrapedProductData(
    val title: String?,
    val description: String?,
    val price: Double?,
    val originalPrice: Double?,
    val brand: String?,
    val sku: String?,
    val images: List<String>,
    val attributes: Map<String, String>
)

data class ScrapeRequest(
    val url: String
)

@Service
class ImageScraperService {

    private val restTemplate = RestTemplate()

    fun scrapeProductPage(url: String): ScrapedProductData {
        val html = fetchPage(url)

        return ScrapedProductData(
            title = extractTitle(html),
            description = extractDescription(html),
            price = extractPrice(html),
            originalPrice = extractOriginalPrice(html),
            brand = extractBrand(html),
            sku = extractSku(html, url),
            images = extractImages(html, url),
            attributes = extractAttributes(html)
        )
    }

    private fun fetchPage(url: String): String {
        val headers = HttpHeaders().apply {
            set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
            set("Accept-Language", "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7")
        }

        val entity = HttpEntity<String>(headers)
        val response = restTemplate.exchange(url, HttpMethod.GET, entity, String::class.java)

        return response.body ?: throw RuntimeException("Failed to fetch page")
    }

    private fun extractTitle(html: String): String? {
        // Try various patterns for product title
        val patterns = listOf(
            """<h1[^>]*class="[^"]*product[^"]*"[^>]*>([^<]+)</h1>""",
            """<h1[^>]*>([^<]+)</h1>""",
            """<meta[^>]*property="og:title"[^>]*content="([^"]+)"""",
            """<title>([^<|]+)"""
        )

        for (pattern in patterns) {
            val regex = Pattern.compile(pattern, Pattern.CASE_INSENSITIVE)
            val matcher = regex.matcher(html)
            if (matcher.find()) {
                return cleanText(matcher.group(1))
            }
        }
        return null
    }

    private fun extractDescription(html: String): String? {
        val patterns = listOf(
            """<meta[^>]*name="description"[^>]*content="([^"]+)"""",
            """<meta[^>]*property="og:description"[^>]*content="([^"]+)"""",
            """<div[^>]*class="[^"]*description[^"]*"[^>]*>(.+?)</div>"""
        )

        for (pattern in patterns) {
            val regex = Pattern.compile(pattern, Pattern.CASE_INSENSITIVE or Pattern.DOTALL)
            val matcher = regex.matcher(html)
            if (matcher.find()) {
                return cleanText(matcher.group(1))
            }
        }
        return null
    }

    private fun extractPrice(html: String): Double? {
        val patterns = listOf(
            """R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:,\d{2})?)""",
            """"price":\s*"?(\d+(?:\.\d{2})?)""",
            """data-price="(\d+(?:\.\d{2})?)"""",
            """<span[^>]*class="[^"]*price[^"]*"[^>]*>R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)"""
        )

        for (pattern in patterns) {
            val regex = Pattern.compile(pattern, Pattern.CASE_INSENSITIVE)
            val matcher = regex.matcher(html)
            if (matcher.find()) {
                val priceStr = matcher.group(1)
                    .replace(".", "")
                    .replace(",", ".")
                return priceStr.toDoubleOrNull()
            }
        }
        return null
    }

    private fun extractOriginalPrice(html: String): Double? {
        val patterns = listOf(
            """<s[^>]*>R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)</s>""",
            """<del[^>]*>R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)</del>""",
            """class="[^"]*original[^"]*"[^>]*>R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)""",
            """class="[^"]*old[^"]*price[^"]*"[^>]*>R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)"""
        )

        for (pattern in patterns) {
            val regex = Pattern.compile(pattern, Pattern.CASE_INSENSITIVE)
            val matcher = regex.matcher(html)
            if (matcher.find()) {
                val priceStr = matcher.group(1)
                    .replace(".", "")
                    .replace(",", ".")
                return priceStr.toDoubleOrNull()
            }
        }
        return null
    }

    private fun extractBrand(html: String): String? {
        val patterns = listOf(
            """<meta[^>]*property="product:brand"[^>]*content="([^"]+)"""",
            """<span[^>]*class="[^"]*brand[^"]*"[^>]*>([^<]+)</span>""",
            """"brand":\s*\{\s*"name":\s*"([^"]+)"""",
            """"brand":\s*"([^"]+)""""
        )

        for (pattern in patterns) {
            val regex = Pattern.compile(pattern, Pattern.CASE_INSENSITIVE)
            val matcher = regex.matcher(html)
            if (matcher.find()) {
                return cleanText(matcher.group(1))
            }
        }
        return null
    }

    private fun extractSku(html: String, url: String): String? {
        val patterns = listOf(
            """<meta[^>]*property="product:retailer_item_id"[^>]*content="([^"]+)"""",
            """"sku":\s*"([^"]+)"""",
            """data-sku="([^"]+)"""",
            """Código:\s*([A-Z0-9]+)""",
            """SKU:\s*([A-Z0-9]+)"""
        )

        for (pattern in patterns) {
            val regex = Pattern.compile(pattern, Pattern.CASE_INSENSITIVE)
            val matcher = regex.matcher(html)
            if (matcher.find()) {
                return matcher.group(1)
            }
        }

        // Try to extract from URL
        val urlPattern = Pattern.compile("""[/\-]([A-Z]?\d{5,})[/\-]?""", Pattern.CASE_INSENSITIVE)
        val urlMatcher = urlPattern.matcher(url)
        if (urlMatcher.find()) {
            return urlMatcher.group(1).uppercase()
        }

        return null
    }

    private fun extractImages(html: String, baseUrl: String): List<String> {
        val images = mutableSetOf<String>()
        val baseHost = URL(baseUrl).let { "${it.protocol}://${it.host}" }

        // Product images from various sources
        val patterns = listOf(
            // JSON-LD structured data
            """"image":\s*\[([^\]]+)\]""",
            """"image":\s*"([^"]+)"""",
            // Meta tags
            """<meta[^>]*property="og:image"[^>]*content="([^"]+)"""",
            """<meta[^>]*property="product:image"[^>]*content="([^"]+)"""",
            // Image tags with product-related classes
            """<img[^>]*class="[^"]*product[^"]*"[^>]*src="([^"]+)"""",
            """<img[^>]*class="[^"]*gallery[^"]*"[^>]*src="([^"]+)"""",
            """<img[^>]*class="[^"]*zoom[^"]*"[^>]*src="([^"]+)"""",
            // Data attributes for lazy loading
            """data-src="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"""",
            """data-zoom-image="([^"]+)"""",
            """data-large="([^"]+)"""",
            // Regular img tags
            """<img[^>]*src="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)""""
        )

        for (pattern in patterns) {
            val regex = Pattern.compile(pattern, Pattern.CASE_INSENSITIVE)
            val matcher = regex.matcher(html)
            while (matcher.find()) {
                val match = matcher.group(1)
                // Handle JSON array
                if (match.contains(",")) {
                    val urlPattern = Pattern.compile(""""([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"""", Pattern.CASE_INSENSITIVE)
                    val urlMatcher = urlPattern.matcher(match)
                    while (urlMatcher.find()) {
                        val imgUrl = normalizeUrl(urlMatcher.group(1), baseHost)
                        if (isValidProductImage(imgUrl)) {
                            images.add(imgUrl)
                        }
                    }
                } else {
                    val imgUrl = normalizeUrl(match, baseHost)
                    if (isValidProductImage(imgUrl)) {
                        images.add(imgUrl)
                    }
                }
            }
        }

        // Filter and sort - prioritize larger images
        return images
            .filter { !it.contains("thumbnail") && !it.contains("icon") && !it.contains("logo") }
            .sortedByDescending { it.length } // Longer URLs often indicate higher resolution
            .take(10)
    }

    private fun extractAttributes(html: String): Map<String, String> {
        val attributes = mutableMapOf<String, String>()

        // Look for specification tables
        val tablePattern = Pattern.compile(
            """<tr[^>]*>\s*<t[hd][^>]*>([^<]+)</t[hd]>\s*<td[^>]*>([^<]+)</td>\s*</tr>""",
            Pattern.CASE_INSENSITIVE or Pattern.DOTALL
        )
        val tableMatcher = tablePattern.matcher(html)
        while (tableMatcher.find()) {
            val key = cleanText(tableMatcher.group(1))
            val value = cleanText(tableMatcher.group(2))
            if (key.isNotBlank() && value.isNotBlank()) {
                attributes[key] = value
            }
        }

        // Look for definition lists
        val dlPattern = Pattern.compile(
            """<dt[^>]*>([^<]+)</dt>\s*<dd[^>]*>([^<]+)</dd>""",
            Pattern.CASE_INSENSITIVE or Pattern.DOTALL
        )
        val dlMatcher = dlPattern.matcher(html)
        while (dlMatcher.find()) {
            val key = cleanText(dlMatcher.group(1))
            val value = cleanText(dlMatcher.group(2))
            if (key.isNotBlank() && value.isNotBlank()) {
                attributes[key] = value
            }
        }

        return attributes
    }

    private fun normalizeUrl(url: String, baseHost: String): String {
        return when {
            url.startsWith("http://") || url.startsWith("https://") -> url
            url.startsWith("//") -> "https:$url"
            url.startsWith("/") -> "$baseHost$url"
            else -> "$baseHost/$url"
        }.replace("&amp;", "&")
    }

    private fun isValidProductImage(url: String): Boolean {
        val lowercaseUrl = url.lowercase()
        return (lowercaseUrl.endsWith(".jpg") ||
                lowercaseUrl.endsWith(".jpeg") ||
                lowercaseUrl.endsWith(".png") ||
                lowercaseUrl.endsWith(".webp") ||
                lowercaseUrl.contains(".jpg") ||
                lowercaseUrl.contains(".png") ||
                lowercaseUrl.contains(".webp")) &&
               !lowercaseUrl.contains("pixel") &&
               !lowercaseUrl.contains("tracking") &&
               !lowercaseUrl.contains("analytics") &&
               !lowercaseUrl.contains("facebook") &&
               !lowercaseUrl.contains("google") &&
               !lowercaseUrl.contains("placeholder")
    }

    private fun cleanText(text: String): String {
        return text
            .replace(Regex("<[^>]+>"), "") // Remove HTML tags
            .replace(Regex("\\s+"), " ")   // Normalize whitespace
            .replace("&nbsp;", " ")
            .replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", "\"")
            .trim()
    }
}
