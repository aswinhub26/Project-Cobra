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
        "no text"
    ].join(", ")

    return [
        `${cleanPrompt}, ${styleBoost}`,
        `${cleanPrompt}, cute sticker illustration, centered composition, thick contour, white background, no watermark`,
        `${cleanPrompt}, whatsapp sticker design, clean background, vector-like, colorful, sharp edges`
    ]
}

async function fetchAsBuffer(url, timeout = 25000) {
    const res = await axios.get(url, {
        responseType: "arraybuffer",
        timeout,
        headers: {
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
            return await fetchAsBuffer(url, 30000)
        } catch (_) {
            // Continue fallback chain.
        }
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
            return await fetchAsBuffer(url, 22000)
        } catch (_) {
            // Continue fallback chain.
        }
    }

    throw new Error("Shizo failed")
}

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
            const prompt = (args || "").trim()

            if (!quotedMedia && !prompt) {
                return helpMessage
            }

            try {
                await sock.sendMessage(chatId, {
                    react: { text: "🪄", key: msg.key }
                })
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

            // MODE 2: prompt -> generated image -> sticker
            const enhancedPrompt = buildPromptVariants(prompt)[0] || prompt

            await sock.sendMessage(chatId, {
                text: `🎨 Creating your sticker...\n🐍 Prompt: *${prompt}*\n⚡ Generating image...\n✨ Converting to sticker...`
            }, { quoted: msg })

            let generatedImage

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
