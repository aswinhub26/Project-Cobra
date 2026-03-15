const axios = require("axios")
const FormData = require("form-data")
const { downloadContentFromMessage } = require("@whiskeysockets/baileys")

const API_TIMEOUT = 45000

const FREE_REMOVEBG_APIS = [
    "https://api.remove.bg/v1.0/removebg", // requires key if user provides one
    "https://sdk.photoroom.com/v1/segment", // may require key depending on plan
    "https://api.slazzer.com/v2.0/remove_image_background" // requires key if user provides one
]

async function streamToBuffer(stream) {
    const chunks = []

    for await (const chunk of stream) {
        chunks.push(chunk)
    }

    return Buffer.concat(chunks)
}

async function uploadToCatbox(buffer, filename = "image.jpg") {
    const form = new FormData()
    form.append("reqtype", "fileupload")
    form.append("fileToUpload", buffer, filename)

    const res = await axios.post("https://catbox.moe/user/api.php", form, {
        headers: form.getHeaders(),
        timeout: 30000
    })

    const url = typeof res.data === "string" ? res.data.trim() : ""

    if (!url.startsWith("http")) {
        throw new Error("Catbox upload failed")
    }

    return url
}

async function uploadToTmpFiles(buffer, filename = "image.jpg") {
async function streamToBuffer(stream) {
    let buffer = Buffer.from([])

    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk])
    }

    return buffer
}

async function uploadImage(buffer, filename = "image.jpg") {
    const form = new FormData()
    form.append("file", buffer, filename)

    const res = await axios.post("https://tmpfiles.org/api/v1/upload", form, {
        headers: form.getHeaders(),
        timeout: 30000
    })

    const uploadedUrl = res?.data?.data?.url

    if (!uploadedUrl) {
        throw new Error("Tmpfiles upload failed")
    }

    return uploadedUrl.replace("tmpfiles.org/", "tmpfiles.org/dl/")
}

async function uploadImage(buffer, filename) {
    const uploaders = [uploadToCatbox, uploadToTmpFiles]

    for (const upload of uploaders) {
        try {
            return await upload(buffer, filename)
        } catch (err) {
            console.log("Upload provider failed:", err.message)
        }
    }

    throw new Error("All upload providers failed")
}

async function removeWithHostedApi(imageBuffer) {
    const apiKey = process.env.REMOVEBG_API_KEY

    if (!apiKey) {
        throw new Error("REMOVEBG_API_KEY is not configured")
    }

    const form = new FormData()
    form.append("size", "auto")
    form.append("image_file", imageBuffer, "input.jpg")

    const res = await axios.post(FREE_REMOVEBG_APIS[0], form, {
        headers: {
            ...form.getHeaders(),
            "X-Api-Key": apiKey
        },
        responseType: "arraybuffer",
        timeout: API_TIMEOUT
    })

    return Buffer.from(res.data)
}

async function removeWithUrlApis(imageUrl) {
    const urlApis = [
        `https://r.jina.ai/http://rbg.remove-background.workers.dev/?image=${encodeURIComponent(imageUrl)}`,
        `https://r.jina.ai/http://removebg-api-production.up.railway.app/removebg?url=${encodeURIComponent(imageUrl)}`
    ]

    for (const endpoint of urlApis) {
        try {
            const res = await axios.get(endpoint, {
                responseType: "arraybuffer",
                timeout: API_TIMEOUT,
        throw new Error("Upload failed")
    }

    // tmpfiles API gives a page URL, convert it to direct download URL
    return uploadedUrl.replace("tmpfiles.org/", "tmpfiles.org/dl/")
}

async function resolveImageResponse(raw, contentType) {
    const type = (contentType || "").toLowerCase()

    if (type.startsWith("image/")) {
        return Buffer.from(raw)
    }

    const text = Buffer.from(raw).toString("utf8")

    try {
        const json = JSON.parse(text)

        const url =
            json?.result?.url ||
            json?.result ||
            json?.url ||
            json?.data?.url ||
            json?.output

        if (!url || typeof url !== "string") {
            throw new Error("No image URL in server response")
        }

        const img = await axios.get(url, {
            responseType: "arraybuffer",
            timeout: 30000
        })

        return Buffer.from(img.data)
    } catch (err) {
        throw new Error("Invalid removebg response")
    }
}

async function removeBackground(buffer) {
    const imageUrl = await uploadImage(buffer)

    const freeServers = [
        `https://widipe.com/removebg?url=${encodeURIComponent(imageUrl)}`,
        `https://api.maher-zubair.tech/ai/removebg?url=${encodeURIComponent(imageUrl)}`,
        `https://api.ryzendesu.vip/api/ai/removebg?url=${encodeURIComponent(imageUrl)}`
    ]

    for (const url of freeServers) {
        try {
            const res = await axios.get(url, {
                responseType: "arraybuffer",
                timeout: 45000,
                validateStatus: () => true
            })

            if (res.status >= 400) {
                throw new Error(`HTTP ${res.status}`)
            }

            const data = Buffer.from(res.data)

            if (data.length > 1000) {
                return data
            }

            throw new Error("Empty response")
        } catch (err) {
            console.log(`URL removebg server failed (${endpoint}):`, err.message)
        }
    }

    throw new Error("All URL removebg servers failed")
}

async function removeWithLocalFallback(imageBuffer) {
    let removeBackground

    try {
        ;({ removeBackground } = require("@imgly/background-removal-node"))
    } catch (err) {
        throw new Error("Local fallback unavailable. Install @imgly/background-removal-node")
    }

    const blob = await removeBackground(imageBuffer)
    const arrayBuffer = await blob.arrayBuffer()

    return Buffer.from(arrayBuffer)
}

async function removeBackgroundFromImage(imageBuffer) {
    // 1) Hosted API with key if user configured it (fastest & highest quality)
    try {
        return await removeWithHostedApi(imageBuffer)
    } catch (err) {
        console.log("Hosted removebg API failed:", err.message)
    }

    // 2) Free URL-based APIs (no key)
    try {
        const publicUrl = await uploadImage(imageBuffer, "image.jpg")
        return await removeWithUrlApis(publicUrl)
    } catch (err) {
        console.log("Free URL removebg APIs failed:", err.message)
    }

    // 3) Local no-api fallback to avoid command failure
    return removeWithLocalFallback(imageBuffer)
            const output = await resolveImageResponse(
                res.data,
                res.headers["content-type"]
            )

            if (output?.length) {
                return output
            }
        } catch (err) {
            console.log(`removebg server failed (${url}):`, err.message)
        }
    }

    throw new Error("All removebg servers failed")
}

module.exports = {
    name: "removebg",

    async execute(sock, msg) {
        try {
            const chatId = msg.key.remoteJid
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
            const image = quoted?.imageMessage

            if (!image) {
                return "🖼 Reply to an image with *.removebg*"
            }

            await sock.sendMessage(
                chatId,
                {
                    text: "🧼 Removing background... please wait"
                },
                { quoted: msg }
            )

            const stream = await downloadContentFromMessage(image, "image")
            const inputBuffer = await streamToBuffer(stream)
            const outputBuffer = await removeBackgroundFromImage(inputBuffer)

            await sock.sendMessage(
                chatId,
                {
                    image: outputBuffer,
                    mimetype: "image/png",
                    caption: "✅ Background removed"
                },
                { quoted: msg }
            )
            await sock.sendMessage(chatId, {
                text: "🧼 Removing background... please wait"
            }, { quoted: msg })

            const stream = await downloadContentFromMessage(image, "image")
            const inputBuffer = await streamToBuffer(stream)

            const outputBuffer = await removeBackground(inputBuffer)

            await sock.sendMessage(chatId, {
                image: outputBuffer,
                mimetype: "image/png",
                caption: "✅ Background removed"
            }, { quoted: msg })

            return null
        } catch (err) {
            console.log("REMOVEBG ERROR:", err)
            return "⚠ Failed to remove background. Try again with a clear image."
        }
    }
}
