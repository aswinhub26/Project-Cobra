const axios = require("axios")

const REQUEST_TIMEOUT = 6000
const MAX_RESULTS = 5

function parseSearchArgs(args) {
    const query = String(args || "").trim()
    if (!query) return { mode: "help" }
    if (["help", "-h", "--help"].includes(query.toLowerCase())) return { mode: "help" }
    return { mode: "query", query }
}

function shortenText(text, maxLength) {
    const clean = String(text || "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()

    if (!clean) return "No summary available."
    if (clean.length <= maxLength) return clean
    return `${clean.slice(0, maxLength - 3).trim()}...`
}

function getDomainFromUrl(url) {
    try {
        return new URL(url).hostname.replace(/^www\./, "")
    } catch {
        return "unknown-source"
    }
}

function normalizeResult(item) {
    if (!item || !item.url) return null

    return {
        title: shortenText(item.title || "Untitled result", 90),
        snippet: shortenText(item.snippet || "No summary available.", 180),
        url: String(item.url).trim(),
        source: item.source || getDomainFromUrl(item.url)
    }
}

function dedupeResults(results) {
    const seen = new Set()
    const deduped = []

    for (const result of results) {
        const normalized = normalizeResult(result)
        if (!normalized) continue

        const key = normalized.url.toLowerCase()
        if (seen.has(key)) continue

        seen.add(key)
        deduped.push(normalized)

        if (deduped.length >= MAX_RESULTS) break
    }

    return deduped
}

async function searchDuckDuckGo(query) {
    const url = "https://api.duckduckgo.com/"
    const response = await axios.get(url, {
        timeout: REQUEST_TIMEOUT,
        params: {
            q: query,
            format: "json",
            no_redirect: 1,
            no_html: 1,
            skip_disambig: 1
        },
        headers: {
            "User-Agent": "Project-Cobra/1.0"
        }
    })

    const payload = response.data || {}
    const results = []

    if (payload.AbstractURL) {
        results.push({
            title: payload.Heading || query,
            snippet: payload.AbstractText || payload.Abstract || "Quick answer from DuckDuckGo.",
            url: payload.AbstractURL,
            source: getDomainFromUrl(payload.AbstractURL)
        })
    }

    const topics = payload.RelatedTopics || []
    for (const topic of topics) {
        if (topic?.FirstURL) {
            results.push({
                title: topic.Text || "DuckDuckGo Result",
                snippet: topic.Text || "Related result",
                url: topic.FirstURL,
                source: getDomainFromUrl(topic.FirstURL)
            })
        }

        const nested = Array.isArray(topic?.Topics) ? topic.Topics : []
        for (const child of nested) {
            if (!child?.FirstURL) continue
            results.push({
                title: child.Text || "DuckDuckGo Result",
                snippet: child.Text || "Related result",
                url: child.FirstURL,
                source: getDomainFromUrl(child.FirstURL)
            })
        }
    }

    return dedupeResults(results)
}

async function searchSearx(query) {
    const instances = [
        "https://searx.be/search",
        "https://search.inetol.net/search"
    ]

    for (const instance of instances) {
        try {
            const response = await axios.get(instance, {
                timeout: REQUEST_TIMEOUT,
                params: {
                    q: query,
                    format: "json",
                    language: "en-US",
                    safesearch: 1
                },
                headers: {
                    "User-Agent": "Project-Cobra/1.0"
                }
            })

            const rows = Array.isArray(response.data?.results) ? response.data.results : []
            const mapped = rows.map((row) => ({
                title: row.title,
                snippet: row.content,
                url: row.url,
                source: row.engine || getDomainFromUrl(row.url)
            }))

            const deduped = dedupeResults(mapped)
            if (deduped.length) return deduped
        } catch (error) {
            console.log(`SEARCH SEARX FAILED (${instance}):`, error.message)
        }
    }

    return []
}

async function searchWikipedia(query) {
    const searchResponse = await axios.get("https://en.wikipedia.org/w/api.php", {
        timeout: REQUEST_TIMEOUT,
        params: {
            action: "query",
            list: "search",
            srsearch: query,
            srlimit: MAX_RESULTS,
            format: "json",
            origin: "*"
        },
        headers: {
            "User-Agent": "Project-Cobra/1.0"
        }
    })

    const hits = Array.isArray(searchResponse.data?.query?.search)
        ? searchResponse.data.query.search
        : []

    const mapped = hits.map((item) => {
        const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(String(item.title || "").replace(/\s+/g, "_"))}`
        return {
            title: item.title,
            snippet: item.snippet,
            url,
            source: "wikipedia.org"
        }
    })

    return dedupeResults(mapped)
}

function formatSearchResults(results, query) {
    const lines = [
        "🔎 *COBRA SEARCH*",
        `📝 Query: ${query}`,
        ""
    ]

    results.forEach((item, index) => {
        lines.push(`${index + 1}️⃣ *${item.title}*`)
        lines.push(`📄 ${item.snippet}`)
        lines.push(`🌐 Source: ${item.source}`)
        lines.push(`🔗 ${item.url}`)
        lines.push("")
    })

    return lines.join("\n").trim()
}

module.exports = {
    name: "search",

    async execute(sock, msg, args, user, data, dbPath, analytics) {
        const chatId = msg.key.remoteJid

        try {
            const parsed = parseSearchArgs(args)

            if (parsed.mode === "help") {
                return `🔎 *COBRA SEARCH*\n\nUsage:\n• *.search latest AI news*\n• *.search best laptops under 50000*\n• *.search history of chola empire*\n\nThis command fetches top web results with short summaries.`
            }

            const { query } = parsed

            await sock.sendMessage(chatId, {
                text: "🔎 *Cobra Search Activated*\n🌐 Searching the web...\n⚡ Fetching top results..."
            }, { quoted: msg })

            const providers = [
                { name: "duckduckgo", fn: searchDuckDuckGo },
                { name: "searx", fn: searchSearx },
                { name: "wikipedia", fn: searchWikipedia }
            ]

            const aggregateResults = []

            for (const provider of providers) {
                try {
                    const results = await provider.fn(query)
                    if (results.length) {
                        aggregateResults.push(...results)
                    }
                } catch (error) {
                    console.log(`SEARCH PROVIDER FAILED (${provider.name}):`, error.message)
                }

                if (dedupeResults(aggregateResults).length >= MAX_RESULTS) break
            }

            const finalResults = dedupeResults(aggregateResults)

            if (!finalResults.length) {
                return "⚠ No useful search results found."
            }

            return formatSearchResults(finalResults, query)
        } catch (error) {
            console.log("SEARCH COMMAND ERROR:", error.message)
            return "⚠ Search failed. Please try again in a moment."
        }
    }
}
