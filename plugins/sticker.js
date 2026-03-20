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

function normalizePrompt(prompt) {
    return String(prompt || "")
        .replace(/\s+/g, " ")
        .trim()
}

function getQuotedMessage(msg) {
    const context = msg?.message?.extendedTextMessage?.contextInfo

    if (!context?.quotedMessage) {
        return null
    }

    return context.quotedMessage
}

function getMediaFromMessage(messageObj) {
    if (!messageObj) {
        return null
    }

    if (messageObj.imageMessage) {
        return { media: messageObj.imageMessage, type: "image" }
    }

    if (messageObj.viewOnceMessage?.message?.imageMessage) {
        return { media: messageObj.viewOnceMessage.message.imageMessage, type: "image" }
    }

    if (messageObj.viewOnceMessageV2?.message?.imageMessage) {
        return { media: messageObj.viewOnceMessageV2.message.imageMessage, type: "image" }
    }

    return null
}

function buildPromptVariants(prompt) {
    const cleanPrompt = normalizePrompt(prompt)

    if (!cleanPrompt) {
        return []
    }

    return [
        `${cleanPrompt}, cute sticker illustration, centered composition, bold outline, vibrant colors, plain background, no text`,
        `${cleanPrompt}, whatsapp sticker design, colorful cartoon art, mascot style, high quality`,
        `${cleanPrompt}, clean vector sticker, centered subject, sharp edges, fun expression`
    ]
}

async function fetchAsBuffer(url, timeout = 20000) {
    const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout,
        maxRedirects: 5,
        headers: {
            "User-Agent": "Project-Cobra-Sticker/2.0",
            Accept: "image/*,*/*;q=0.8"
        },
        validateStatus: (status) => status >= 200 && status < 300
    })

    const contentType = String(response.headers?.["content-type"] || "").toLowerCase()
    const buffer = Buffer.from(response.data)

    if (!contentType.includes("image")) {
        throw new Error("Non-image response")
    }

    if (!buffer.length) {
        throw new Error("Empty image response")
    }

    return buffer
}

async function generateFromPollinations(prompt) {
    const seed = Date.now()
    const urls = [
        `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${seed}&model=flux&nologo=true`,
        `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${seed + 11}&enhance=true`
    ]

    let lastError
    for (const url of urls) {
        try {
            return await fetchAsBuffer(url, 25000)
        } catch (err) {
            lastError = err
        }
    }

    throw lastError || new Error("Pollinations failed")
}

async function generateFromShizo(prompt) {
    const urls = [
        `https://api.shizo.top/ai/text2img?prompt=${encodeURIComponent(prompt)}`,
        `https://api.shizo.top/api/ai/text2img?prompt=${encodeURIComponent(prompt)}`
    ]

    let lastError
    for (const url of urls) {
        try {
            return await fetchAsBuffer(url, 25000)
        } catch (err) {
            lastError = err
        }
    }

    throw lastError || new Error("Shizo failed")
}

async function generateFromFallbackWeb(prompt) {
    const tag = encodeURIComponent(prompt.split(" ").slice(0, 4).join(","))
    const query = encodeURIComponent(prompt)
    const urls = [
        `https://loremflickr.com/1024/1024/${tag}`,
        `https://picsum.photos/seed/${query}/1024/1024`,
        `https://dummyimage.com/1024x1024/111827/f8fafc.png&text=${query}`
    ]

    let lastError
    for (const url of urls) {
        try {
            return await fetchAsBuffer(url, 12000)
        } catch (err) {
            lastError = err
        }
    }

    throw lastError || new Error("Fallback image providers failed")
}

async function generateStickerImage(prompt) {
    const variants = buildPromptVariants(prompt)
    let lastError

    for (const variant of variants) {
        const generators = [generateFromPollinations, generateFromShizo, generateFromFallbackWeb]

        for (const generator of generators) {
            try {
                const buffer = await generator(variant)
                if (buffer && buffer.length > 512) {
                    return buffer
                }
            } catch (err) {
                lastError = err
            }
        }
    }

    throw lastError || new Error("Sticker generation failed")
}

async function convertQuotedImageToBuffer(media) {
    const stream = await downloadContentFromMessage(media, "image")
    return streamToBuffer(stream)
}

module.exports = {
    name: "sticker",

    async execute(sock, msg, args, user, data, dbPath, analytics) {
        const chatId = msg.key.remoteJid
        const prompt = normalizePrompt(args)
        const quotedMessage = getQuotedMessage(msg)
        const quotedMedia = getMediaFromMessage(quotedMessage)
        const helpText = `🖼️ *COBRA STICKER*\n\n• Reply to an image with *.sticker*\n• Or use *.sticker cobra warrior*\n• View-once replied images are supported when available\n\n✨ Cobra will convert the image or generate one for you and send it as a sticker.`

        try {
            if (!quotedMedia && !prompt) {
                return helpText
            }

            try {
                await sock.sendMessage(chatId, {
                    react: { text: "🪄", key: msg.key }
                })
            } catch (_) {
                // Optional reaction.
            }

            if (quotedMedia) {
                await sock.sendMessage(chatId, {
                    text: "🪄 Converting your image to a sticker...\n✨ Please wait a moment."
                }, { quoted: msg })

                const imageBuffer = await convertQuotedImageToBuffer(quotedMedia.media)

                if (!imageBuffer || imageBuffer.length < 512) {
                    return "⚠️ Failed to read the replied image for sticker creation."
                }

                await sock.sendMessage(chatId, {
                    sticker: imageBuffer
                }, { quoted: msg })

                return null
            }

            await sock.sendMessage(chatId, {
                text: `🎨 Creating your Cobra sticker...\n🐍 Prompt: *${prompt}*\n⚡ Generating artwork from free sources\n✨ Converting to sticker next...`
            }, { quoted: msg })

            const generatedImage = await generateStickerImage(prompt)

            await sock.sendMessage(chatId, {
                sticker: generatedImage
            }, { quoted: msg })

            return null
        } catch (err) {
            console.log("STICKER ERROR:", err)
            return "⚠️ Failed to create sticker right now. Please try again later."
        }
    }
}
