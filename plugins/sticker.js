const axios = require("axios")
const { downloadContentFromMessage } = require("@whiskeysockets/baileys")

function streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
        const chunks = []

        stream.on("data", (chunk) => chunks.push(chunk))
        stream.on("end", () => resolve(Buffer.concat(chunks)))
        stream.on("error", reject)
    })
}

function getQuotedMessage(msg) {
    const context = msg?.message?.extendedTextMessage?.contextInfo
    if (!context?.quotedMessage) return null

    return {
        quotedMessage: context.quotedMessage,
        participant: context.participant,
        stanzaId: context.stanzaId
    }
}

function getMediaFromMessage(messageObj) {
    if (!messageObj) return null

    if (messageObj.imageMessage) return { type: "image", media: messageObj.imageMessage }
    if (messageObj.videoMessage) return { type: "video", media: messageObj.videoMessage }
    if (messageObj.stickerMessage) return { type: "sticker", media: messageObj.stickerMessage }
    if (messageObj.documentMessage) return { type: "document", media: messageObj.documentMessage }

    const viewOnce = messageObj.viewOnceMessage?.message || messageObj.viewOnceMessageV2?.message
    if (viewOnce?.imageMessage) return { type: "image", media: viewOnce.imageMessage }
    if (viewOnce?.videoMessage) return { type: "video", media: viewOnce.videoMessage }

    return null
}

function normalizePrompt(prompt) {
    return String(prompt || "").trim().replace(/\s+/g, " ")
}

function uniqueKeywords(prompt) {
    const tokens = normalizePrompt(prompt)
        .toLowerCase()
        .replace(/[^a-z0-9\s,]/g, " ")
        .split(/[\s,]+/)
        .filter(Boolean)

    const stop = new Set([
        "sticker", "style", "centered", "subject", "bold", "outline", "vibrant", "colors",
        "clean", "simple", "background", "high", "contrast", "mascot", "cartoon", "art",
        "no", "text", "quality", "hd", "design", "illustration", "vector", "whatsapp"
    ])

    const out = []
    for (const token of tokens) {
        if (stop.has(token)) continue
        if (!out.includes(token)) out.push(token)
        if (out.length >= 6) break
    }

    return out.length ? out : ["cobra"]
}

function buildPromptVariants(prompt) {
    const cleanPrompt = normalizePrompt(prompt)
    if (!cleanPrompt) return []

    return [
        `${cleanPrompt}, sticker style, centered subject, bold outline, vibrant colors, clean simple background, mascot cartoon art, no text`,
        `${cleanPrompt}, cute sticker illustration, centered composition, thick contour, plain background, high quality`,
        `${cleanPrompt}, whatsapp sticker design, vector-like, colorful, sharp edges`
    ]
}

async function fetchAsBuffer(url, timeout = 4500, extra = {}) {
    const res = await axios.get(url, {
        responseType: "arraybuffer",
        timeout,
        maxRedirects: 5,
        headers: {
            "User-Agent": "Project-Cobra-Sticker/1.2",
            Accept: "image/*,*/*;q=0.8"
        },
    if (messageObj.imageMessage) {
        return { type: "image", media: messageObj.imageMessage }
    }

    const viewOnce = messageObj.viewOnceMessage?.message || messageObj.viewOnceMessageV2?.message
    if (viewOnce?.imageMessage) {
        return { type: "image", media: viewOnce.imageMessage }
    }

    return null
}

function buildPromptVariants(prompt) {
    const cleanPrompt = String(prompt || "").trim().replace(/\s+/g, " ")

    if (!cleanPrompt) return []

    const styleBoost = [
        "sticker style",
        "centered subject",
        "bold outline",
        "vibrant colors",
        "clean simple background",
        "high contrast",
        "mascot cartoon art",
        "no text",
        "high quality"
        "no text"
    ].join(", ")

    return [
        `${cleanPrompt}, ${styleBoost}`,
        `${cleanPrompt}, cute sticker illustration, centered composition, thick contour, plain background, no watermark`,
        `${cleanPrompt}, whatsapp sticker design, vector-like, colorful, sharp edges, HD`
    ]
}

async function fetchAsBuffer(url, timeout = 5000, extra = {}) {
        `${cleanPrompt}, cute sticker illustration, centered composition, thick contour, white background, no watermark`,
        `${cleanPrompt}, whatsapp sticker design, clean background, vector-like, colorful, sharp edges`
    ]
}

async function fetchAsBuffer(url, timeout = 25000) {
    const res = await axios.get(url, {
        responseType: "arraybuffer",
        timeout,
        headers: {
            "User-Agent": "Project-Cobra-Sticker/1.1",
            Accept: "image/*,*/*;q=0.8"
        },
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 300,
        ...extra
    })

    const type = String(res.headers?.["content-type"] || "").toLowerCase()
    const buffer = Buffer.from(res.data)

    if (!buffer || buffer.length < 1500) throw new Error("Empty image buffer")
    if (type && !type.includes("image")) throw new Error("Non-image payload")
    const contentType = String(res.headers?.["content-type"] || "")
    const buffer = Buffer.from(res.data)

    if (!buffer || buffer.length < 1500) {
        throw new Error("Empty or too-small image response")
    }

    if (contentType && !contentType.includes("image")) {
        throw new Error("Non-image response")
    }

    return buffer
}

function scoreRelevance(text, keywords) {
    const hay = String(text || "").toLowerCase()
    return keywords.reduce((acc, key) => (hay.includes(key) ? acc + 1 : acc), 0)
function uniqueKeywords(prompt) {
    const tokens = String(prompt || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s,]/g, " ")
        .split(/[\s,]+/)
        .filter(Boolean)

    const stop = new Set(["sticker", "style", "centered", "subject", "bold", "outline", "vibrant", "colors", "clean", "simple", "background", "high", "contrast", "mascot", "cartoon", "art", "no", "text", "quality", "hd", "design"])

    const final = []
    for (const t of tokens) {
        if (stop.has(t)) continue
        if (!final.includes(t)) final.push(t)
        if (final.length >= 5) break
    }

    return final.length ? final : ["cobra"]
}

async function fetchFromPollinations(prompt, attempted) {
    const seed = Date.now()
    const urls = [
        `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&model=flux&seed=${seed}&nologo=true`,
        `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&enhance=true&seed=${seed + 13}`
    ]

    for (const url of urls) {
        if (attempted.has(url)) continue
        attempted.add(url)
        try {
            return await fetchAsBuffer(url, 5000)
        } catch (_) {}
    const candidates = [
        `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&model=flux&seed=${seed}&nologo=true`,
        `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&enhance=true&seed=${seed + 11}`
            "User-Agent": "Project-Cobra-Sticker/1.0"
        },
        validateStatus: (status) => status >= 200 && status < 300
    })

    const buffer = Buffer.from(res.data)

    if (!buffer || buffer.length < 1024) {
        throw new Error("Empty or too-small image response")
    }

    return buffer
}

async function fetchFromPollinations(prompt, attempted) {
    const seed = Date.now()
    const candidates = [
        `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&model=flux&seed=${seed}`,
        `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&enhance=true&seed=${seed + 7}`
    ]

    for (const url of candidates) {
        if (attempted.has(url)) continue
        attempted.add(url)
        try {
            return await fetchAsBuffer(url, 5200)
        } catch (_) {}

        try {
            return await fetchAsBuffer(url, 30000)
        } catch (_) {
            // Continue fallback chain.
        }
    }

    throw new Error("Pollinations failed")
}

async function fetchFromShizo(prompt, attempted) {
    const urls = [
    const candidates = [
        `https://api.shizo.top/ai/text2img?prompt=${encodeURIComponent(prompt)}`,
        `https://api.shizo.top/api/ai/text2img?prompt=${encodeURIComponent(prompt)}`
    ]

    for (const url of urls) {
        if (attempted.has(url)) continue
        attempted.add(url)
        try {
            return await fetchAsBuffer(url, 5000)
        } catch (_) {}
    }

    throw new Error("Shizo failed")
}

async function pickOpenverseImage(keywords) {
    const query = encodeURIComponent(keywords.join(" "))
    const api = `https://api.openverse.org/v1/images/?q=${query}&license_type=all&page_size=10`
    const res = await axios.get(api, { timeout: 3000 })
    const items = res.data?.results || []

    let best = null
    let bestScore = -1

    for (const item of items) {
        const url = item?.url || item?.thumbnail || item?.foreign_landing_url
        if (!url) continue

        const score = scoreRelevance(`${item?.title || ""} ${(item?.tags || []).join(" ")}`, keywords)
        if (score > bestScore) {
            best = url
            bestScore = score
        }
    }

    if (!best) throw new Error("Openverse no result")
    return best
}

async function pickWikimediaImage(keywords) {
    const q = encodeURIComponent(keywords.join(" "))
    const api = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${q}&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url`
    const res = await axios.get(api, { timeout: 3000 })
    const pages = Object.values(res.data?.query?.pages || {})

    let best = null
    let bestScore = -1

    for (const page of pages) {
        const url = page?.imageinfo?.[0]?.url
        if (!url) continue

        const score = scoreRelevance(page?.title || "", keywords)
        if (score > bestScore) {
            best = url
            bestScore = score
        }
    }

    if (!best) throw new Error("Wikimedia no result")
    return best
}

async function pickFlickrPublicFeedImage(keywords) {
    const tags = encodeURIComponent(keywords.slice(0, 4).join(","))
    const api = `https://www.flickr.com/services/feeds/photos_public.gne?format=json&nojsoncallback=1&tags=${tags}`
    const res = await axios.get(api, { timeout: 3000 })
    const items = res.data?.items || []

    let best = null
    let bestScore = -1

    for (const item of items) {
        const url = item?.media?.m?.replace("_m.", "_b.") || item?.media?.m
        if (!url) continue

        const score = scoreRelevance(`${item?.title || ""} ${item?.tags || ""}`, keywords)
        if (score > bestScore) {
            best = url
            bestScore = score
        }
    }

    if (!best) throw new Error("Flickr no result")
    return best
}

async function fetchFromWebImageProviders(prompt, attempted) {
    const keywords = uniqueKeywords(prompt)
    const textQuery = keywords.join(" ")

    const providers = [
        async () => pickOpenverseImage(keywords),
        async () => pickWikimediaImage(keywords),
        async () => pickFlickrPublicFeedImage(keywords),
        async () => `https://source.unsplash.com/1024x1024/?${encodeURIComponent(textQuery)}`,
        async () => `https://loremflickr.com/1024/1024/${encodeURIComponent(keywords.join(","))}`
    ]

    for (const provider of providers) {
        try {
            const url = await provider()
            if (!url || attempted.has(url)) continue
            attempted.add(url)

            const img = await fetchAsBuffer(url, 4200)
            if (img?.length > 1500) return img
    for (const url of candidates) {
        if (attempted.has(url)) continue
        attempted.add(url)
        try {
            return await fetchAsBuffer(url, 5200)
        } catch (_) {}

        try {
            return await fetchAsBuffer(url, 22000)
        } catch (_) {
            // Continue fallback chain.
        }
    }

    throw new Error("Shizo failed")
}

async function fetchFromWebImageProviders(prompt, attempted) {
    const tags = uniqueKeywords(prompt)
    const query = tags.join(",")
    const textQuery = tags.join(" ")

    // 5 public web sources fallback (no paid keys)
    const providers = [
        `https://source.unsplash.com/1024x1024/?${encodeURIComponent(textQuery)}`,
        `https://loremflickr.com/1024/1024/${encodeURIComponent(query)}`,
        `https://picsum.photos/seed/${encodeURIComponent(textQuery)}/1024/1024`,
        `https://source.boringavatars.com/beam/1024/${encodeURIComponent(textQuery)}?colors=0B1020,1D3557,457B9D,A8DADC,F1FAEE`,
        `https://dummyimage.com/1024x1024/111827/f8fafc.png&text=${encodeURIComponent(tags[0])}`
    ]

    for (const url of providers) {
        if (attempted.has(url)) continue
        attempted.add(url)
        try {
            const isAvatar = url.includes("boringavatars")
            // avatar endpoint returns svg. Baileys sticker accepts image-like buffers,
            // but to stay safe we only keep this as a late fallback.
            return await fetchAsBuffer(url, isAvatar ? 3200 : 4200)
        } catch (_) {}
    }

    throw new Error("All web image providers failed")
}

function withTimeout(promise, ms, label) {
    let timer
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timeout`)), ms)
    })

    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
    let t
    const timeout = new Promise((_, reject) => {
        t = setTimeout(() => reject(new Error(`${label} timeout`)), ms)
    })

    return Promise.race([promise, timeout]).finally(() => clearTimeout(t))
async function fetchFromBackup(prompt, attempted) {
    const url = `https://dummyimage.com/1024x1024/111827/f8fafc.png&text=${encodeURIComponent(prompt.slice(0, 64))}`

    if (attempted.has(url)) {
        throw new Error("Backup URL already used")
    }

    attempted.add(url)
    return fetchAsBuffer(url, 15000)
}

async function generateStickerImage(prompt) {
    const attempted = new Set()
    const variants = buildPromptVariants(prompt)

    if (!variants.length) throw new Error("No prompt variant")

    // Fast path first.
    try {
        const image = await withTimeout(Promise.any([
            fetchFromPollinations(variants[0], attempted),
            fetchFromShizo(variants[0], attempted)
        ]), 6200, "AI generation")

        if (image?.length > 1500) return image
    } catch (_) {}

    for (const variant of variants) {
        try {
            const ai = await withTimeout(Promise.any([
                fetchFromPollinations(variant, attempted),
                fetchFromShizo(variant, attempted)
            ]), 6200, "AI variant generation")

            if (ai?.length > 1500) return ai
        } catch (_) {}

        try {
            const web = await withTimeout(fetchFromWebImageProviders(variant, attempted), 5000, "Web fallback")
            if (web?.length > 1500) return web
    // Fast path: run primary AI sources in parallel for first variant.
    const v1 = variants[0]
    try {
        const img = await withTimeout(
            Promise.any([
                fetchFromPollinations(v1, attempted),
                fetchFromShizo(v1, attempted)
            ]),
            6000,
            "AI generation"
        )

        if (img?.length > 1500) return img
    } catch (_) {
        // Continue to broader fallback.
    }

    // Retry with additional prompt variants on AI first, then web image providers.
    for (const variant of variants) {
        try {
            const aiImg = await withTimeout(
                Promise.any([
                    fetchFromPollinations(variant, attempted),
                    fetchFromShizo(variant, attempted)
                ]),
                6200,
                "AI variant generation"
            )

            if (aiImg?.length > 1500) return aiImg
        } catch (_) {}

        try {
            const webImg = await withTimeout(fetchFromWebImageProviders(variant, attempted), 4500, "web image fallback")
            if (webImg?.length > 1500) return webImg
        } catch (_) {}
    }

    throw new Error("All image generation and web fallbacks failed")

    for (const variant of buildPromptVariants(prompt)) {
        const sources = [
            () => fetchFromPollinations(variant, attempted),
            () => fetchFromShizo(variant, attempted),
            () => fetchFromBackup(variant, attempted)
        ]

        for (const source of sources) {
            try {
                const image = await source()
                if (image?.length > 1024) return image
            } catch (_) {
                // Continue source fallback.
            }
        }
    }

    throw new Error("All image generation servers failed")
}

async function convertMediaToSticker(sock, chatId, msg, mediaBuffer) {
    await sock.sendMessage(chatId, { sticker: mediaBuffer }, { quoted: msg })
}

module.exports = {
    name: "sticker",

    async execute(sock, msg, args, user, data, dbPath, analytics) {
        const chatId = msg.key.remoteJid

        const helpMessage = `🖼 *COBRA STICKER*\n\nReply mode:\n• Reply to an image with *.sticker*\n\nPrompt mode:\n• *.sticker cobra warrior*\n• *.sticker cute baby snake cartoon*\n\nThis command can:\n✨ convert images to stickers\n🎨 generate AI stickers from text prompts`

        try {
            const quoted = getQuotedMessage(msg)
            const quotedMedia = getMediaFromMessage(quoted?.quotedMessage)
            const hasQuoted = Boolean(quoted?.quotedMessage)
            const prompt = normalizePrompt(args)

            if (!hasQuoted && !prompt) return helpMessage
            const prompt = (args || "").trim()

            if (!hasQuoted && !prompt) return helpMessage
            const prompt = (args || "").trim()

            if (!quotedMedia && !prompt) {
                return helpMessage
            }

            try {
                await sock.sendMessage(chatId, {
                    react: { text: "🪄", key: msg.key }
                })
            } catch (_) {}

            if (hasQuoted) {
                if (!quotedMedia || quotedMedia.type !== "image") {
                    return "⚠ Unsupported reply media. Please reply to an image with *.sticker*."
            // MODE 1: replied media -> sticker (only images supported)
            if (hasQuoted) {
                if (!quotedMedia || quotedMedia.type !== "image") {
                    return "⚠ Unsupported reply media. Please reply to an image with *.sticker*."
            } catch (_) {
                // Optional reaction only.
            }

            // MODE 1: replied image -> sticker
            if (quotedMedia) {
                if (quotedMedia.type !== "image") {
                    return "⚠ Reply to an image with *.sticker* to create a sticker."
                }

                await sock.sendMessage(chatId, {
                    text: "🪄 Converting image to sticker...\n✨ Please wait..."
                }, { quoted: msg })

                try {
                    const stream = await downloadContentFromMessage(quotedMedia.media, "image")
                    const mediaBuffer = await streamToBuffer(stream)

                    if (!mediaBuffer || mediaBuffer.length < 1500) {
                    if (!mediaBuffer || mediaBuffer.length < 1024) {
                        return "⚠ Failed to read the image for sticker creation."
                    }

                    await convertMediaToSticker(sock, chatId, msg, mediaBuffer)
                    return null
                } catch (err) {
                    console.log("STICKER MEDIA MODE ERROR:", err.message)
                    return "⚠ Failed to read the image for sticker creation."
                }
            }

            // MODE 2: prompt -> image generation + web fallback -> sticker
            // MODE 2: prompt -> generated image -> sticker
            const enhancedPrompt = buildPromptVariants(prompt)[0] || prompt

            await sock.sendMessage(chatId, {
                text: `🎨 Creating your sticker...\n🐍 Prompt: *${prompt}*\n⚡ Generating image...\n✨ Converting to sticker...`
            }, { quoted: msg })

            try {
                const generatedImage = await generateStickerImage(prompt)
                await convertMediaToSticker(sock, chatId, msg, generatedImage)
                return null
            let generatedImage
            try {
                generatedImage = await generateStickerImage(prompt)

            try {
                generatedImage = await generateStickerImage(enhancedPrompt)
            } catch (err) {
                console.log("STICKER PROMPT GENERATION ERROR:", err.message)
                return "⚠ Failed to create sticker right now. Please try again later."
            }

            await convertMediaToSticker(sock, chatId, msg, generatedImage)
            return null
        } catch (err) {
            console.log("STICKER COMMAND ERROR:", err)
            return "⚠ Failed to create sticker right now. Please try again later."
        }
    }
}
