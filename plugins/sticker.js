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
    ].join(", ")

    return [
        `${cleanPrompt}, ${styleBoost}`,
        `${cleanPrompt}, cute sticker illustration, centered composition, thick contour, plain background, no watermark`,
        `${cleanPrompt}, whatsapp sticker design, vector-like, colorful, sharp edges, HD`
    ]
}

async function fetchAsBuffer(url, timeout = 5000, extra = {}) {
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
    const candidates = [
        `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&model=flux&seed=${seed}&nologo=true`,
        `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&enhance=true&seed=${seed + 11}`
    ]

    for (const url of candidates) {
        if (attempted.has(url)) continue
        attempted.add(url)
        try {
            return await fetchAsBuffer(url, 5200)
        } catch (_) {}
    }

    throw new Error("Pollinations failed")
}

async function fetchFromShizo(prompt, attempted) {
    const candidates = [
        `https://api.shizo.top/ai/text2img?prompt=${encodeURIComponent(prompt)}`,
        `https://api.shizo.top/api/ai/text2img?prompt=${encodeURIComponent(prompt)}`
    ]

    for (const url of candidates) {
        if (attempted.has(url)) continue
        attempted.add(url)
        try {
            return await fetchAsBuffer(url, 5200)
        } catch (_) {}
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
    let t
    const timeout = new Promise((_, reject) => {
        t = setTimeout(() => reject(new Error(`${label} timeout`)), ms)
    })

    return Promise.race([promise, timeout]).finally(() => clearTimeout(t))
}

async function generateStickerImage(prompt) {
    const attempted = new Set()
    const variants = buildPromptVariants(prompt)

    if (!variants.length) throw new Error("No prompt variant")

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
            const prompt = (args || "").trim()

            if (!hasQuoted && !prompt) return helpMessage

            try {
                await sock.sendMessage(chatId, {
                    react: { text: "🪄", key: msg.key }
                })
            } catch (_) {}

            // MODE 1: replied media -> sticker (only images supported)
            if (hasQuoted) {
                if (!quotedMedia || quotedMedia.type !== "image") {
                    return "⚠ Unsupported reply media. Please reply to an image with *.sticker*."
                }

                await sock.sendMessage(chatId, {
                    text: "🪄 Converting image to sticker...\n✨ Please wait..."
                }, { quoted: msg })

                try {
                    const stream = await downloadContentFromMessage(quotedMedia.media, "image")
                    const mediaBuffer = await streamToBuffer(stream)

                    if (!mediaBuffer || mediaBuffer.length < 1500) {
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
            await sock.sendMessage(chatId, {
                text: `🎨 Creating your sticker...\n🐍 Prompt: *${prompt}*\n⚡ Generating image...\n✨ Converting to sticker...`
            }, { quoted: msg })

            let generatedImage
            try {
                generatedImage = await generateStickerImage(prompt)
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
