const axios = require("axios")

const REQUEST_TIMEOUT = 7000
const MAX_ARTICLES = 5

const RSS_SOURCES = {
english: [
{
name: "BBC News",
url: "https://feeds.bbci.co.uk/news/world/rss.xml"
},
{
name: "The Hindu",
url: "https://www.thehindu.com/news/national/feeder/default.rss"
},
{
name: "Google News",
url: "https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en"
}
],
tamil: [
{
name: "BBC Tamil",
url: "https://feeds.bbci.co.uk/tamil/rss.xml"
},
{
name: "Google News Tamil",
url: "https://news.google.com/rss?hl=ta&gl=IN&ceid=IN:ta"
},
{
name: "Google News",
url: "https://news.google.com/rss?hl=ta&gl=IN&ceid=IN:ta"
}
]
}

function parseLanguage(args) {
const value = String(args || "").trim().toLowerCase()

if (!value) return { ok: true, language: "english" }
if (["english", "en"].includes(value)) return { ok: true, language: "english" }
if (["tamil", "ta"].includes(value)) return { ok: true, language: "tamil" }

return { ok: false }
}

function decodeEntities(text) {
return String(text || "")
.replace(/<!\[CDATA\[(.*?)\]\]>/gis, "$1")
.replace(/&amp;/g, "&")
.replace(/&lt;/g, "<")
.replace(/&gt;/g, ">")
.replace(/&quot;/g, '"')
.replace(/&#39;/g, "'")
}

function shortenText(text, maxLength = 180) {
const clean = decodeEntities(String(text || ""))
.replace(/<[^>]*>/g, " ")
.replace(/\s+/g, " ")
.trim()

if (!clean) return "Summary unavailable."
if (clean.length <= maxLength) return clean
return `${clean.slice(0, maxLength - 3).trim()}...`
}

function getTagValue(block, tagName) {
const pattern = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i")
const match = block.match(pattern)
return match ? match[1].trim() : ""
}

function getAttrValue(block, tagName, attrName) {
const pattern = new RegExp(`<${tagName}[^>]*${attrName}=["']([^"']+)["'][^>]*>`, "i")
const match = block.match(pattern)
return match ? match[1].trim() : ""
}

function getLink(block) {
const linkTag = block.match(/<link\b[^>]*>/i)
if (linkTag && /href=/i.test(linkTag[0])) {
const href = getAttrValue(linkTag[0], "link", "href")
if (href) return href
}

const rawLink = getTagValue(block, "link")
if (rawLink) return rawLink.replace(/<!\[CDATA\[(.*?)\]\]>/gis, "$1").trim()

return ""
}

function extractThumbnail(block) {
const mediaThumb = getAttrValue(block, "media:thumbnail", "url")
if (mediaThumb) return mediaThumb

const mediaContent = getAttrValue(block, "media:content", "url")
if (mediaContent) return mediaContent

const enclosure = getAttrValue(block, "enclosure", "url")
if (enclosure) return enclosure

const imageInDesc = decodeEntities(getTagValue(block, "description")).match(/<img[^>]+src=["']([^"']+)["']/i)
if (imageInDesc) return imageInDesc[1]

return null
}

function parseRSSItems(xml, fallbackSourceName) {
const sourceName = shortenText(getTagValue(xml, "title") || fallbackSourceName, 80)
const items = []

const rssMatches = xml.match(/<item\b[\s\S]*?<\/item>/gi) || []
for (const block of rssMatches) {
const title = shortenText(getTagValue(block, "title"), 120)
const summary = shortenText(
getTagValue(block, "description") || getTagValue(block, "content:encoded") || getTagValue(block, "content"),
220
)
const url = decodeEntities(getLink(block))

if (!title || !url) continue

items.push({
title,
summary,
source: shortenText(getTagValue(block, "source") || sourceName || fallbackSourceName, 50),
url,
date: getTagValue(block, "pubDate") || getTagValue(block, "published") || getTagValue(block, "updated"),
thumbnail: extractThumbnail(block)
})
}

const atomMatches = xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || []
for (const block of atomMatches) {
const title = shortenText(getTagValue(block, "title"), 120)
const summary = shortenText(getTagValue(block, "summary") || getTagValue(block, "content"), 220)
const url = decodeEntities(getLink(block))

if (!title || !url) continue

items.push({
title,
summary,
source: shortenText(getTagValue(block, "source") || sourceName || fallbackSourceName, 50),
url,
date: getTagValue(block, "published") || getTagValue(block, "updated"),
thumbnail: extractThumbnail(block)
})
}

return items
}

function dedupeArticles(articles) {
const seen = new Set()
const output = []

for (const article of articles) {
const key = `${article.title.toLowerCase()}|${article.url.toLowerCase()}`
if (seen.has(key)) continue
seen.add(key)
output.push(article)
}

return output
}

function keepRecentArticles(articles) {
const now = Date.now()
const oneDayMs = 24 * 60 * 60 * 1000

const withDate = articles.map((article) => {
const timestamp = Date.parse(article.date || "")
return {
...article,
timestamp: Number.isNaN(timestamp) ? 0 : timestamp
}
})

const sorted = withDate.sort((a, b) => b.timestamp - a.timestamp)
const recentOnly = sorted.filter((item) => item.timestamp && now - item.timestamp <= oneDayMs)

return recentOnly.length ? recentOnly : sorted
}

async function fetchFromSources(sources) {
for (const source of sources) {
try {
const response = await axios.get(source.url, {
timeout: REQUEST_TIMEOUT,
headers: {
"User-Agent": "Project-Cobra-NewsBot/1.0"
}
})

const parsedItems = parseRSSItems(response.data, source.name)
if (parsedItems.length) return parsedItems
} catch (error) {
console.log(`NEWS SOURCE FAILED (${source.name}):`, error.message)
}
}

return []
}

async function fetchEnglishNews() {
return fetchFromSources(RSS_SOURCES.english)
}

async function fetchTamilNews() {
return fetchFromSources(RSS_SOURCES.tamil)
}

function buildNewsCaption(article, index) {
return `📰 *${index + 1}. ${article.title}*\n🧾 ${article.summary}\n🌐 Source: ${article.source || "Trusted News"}\n🔗 Read: ${article.url}`
}

async function sendNewsArticles(sock, msg, language, articles) {
const chatId = msg.key.remoteJid
const languageLabel = language === "tamil" ? "Tamil" : "English"

await sock.sendMessage(chatId, {
text: `🗞 *Top ${languageLabel} News* (${articles.length})\n\n${articles
.map((article, index) => buildNewsCaption(article, index))
.join("\n\n")}`
}, { quoted: msg })

for (let index = 0; index < articles.length; index++) {
const article = articles[index]
if (!article.thumbnail) continue

try {
await sock.sendMessage(chatId, {
image: { url: article.thumbnail },
caption: buildNewsCaption(article, index)
}, { quoted: msg })
} catch (error) {
console.log("NEWS IMAGE SEND FAILED:", error.message)
}
}
}

module.exports = {
name: "news",

async execute(sock, msg, args, user, data, dbPath, analytics) {
const chatId = msg.key.remoteJid

try {
const languageResult = parseLanguage(args)

if (!languageResult.ok) {
return `📰 *COBRA NEWS*\n\nUsage:\n.news\n.news english\n.news tamil\n.news en\n.news ta`
}

await sock.sendMessage(chatId, {
text: "🗞 Fetching latest news..."
}, { quoted: msg })

const language = languageResult.language
const fetched = language === "tamil"
? await fetchTamilNews()
: await fetchEnglishNews()

const finalArticles = keepRecentArticles(dedupeArticles(fetched)).slice(0, MAX_ARTICLES)

if (!finalArticles.length) {
return "⚠ Unable to fetch latest news right now. Please try again later."
}

await sendNewsArticles(sock, msg, language, finalArticles)
return null
} catch (error) {
console.log("NEWS COMMAND ERROR:", error)
return "⚠ Unable to fetch latest news right now. Please try again later."
}
}
}
