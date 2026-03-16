const fs = require("fs")
const path = require("path")
const axios = require("axios")
const ytdlp = require("yt-dlp-exec")

const CONFIG_PATH = path.join(__dirname, "..", "database", "autostatus.json")
const TEMP_DIR = path.join(__dirname, "..", "temp")
const MAX_STATUS_SIZE = 15 * 1024 * 1024 // 15MB safety threshold

const SUPPORTED_HOSTS = {
  youtube: ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"],
  instagram: ["instagram.com", "www.instagram.com"],
  facebook: ["facebook.com", "www.facebook.com", "m.facebook.com", "fb.watch"],
  sharechat: ["sharechat.com", "www.sharechat.com"],
  moj: ["mojapp.in", "www.mojapp.in", "mojvideo.com", "www.mojvideo.com", "mojapp.com"]
}

function ensureDirs() {
  const dbDir = path.join(__dirname, "..", "database")
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true })
}

function loadAutoStatusConfig() {
  ensureDirs()

  if (!fs.existsSync(CONFIG_PATH)) {
    const defaultConfig = {
      enabled: false,
      lastUpdatedBy: "system",
      updatedAt: new Date().toISOString()
    }

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2))
    return defaultConfig
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"))
    return {
      enabled: Boolean(parsed.enabled),
      lastUpdatedBy: parsed.lastUpdatedBy || "unknown",
      updatedAt: parsed.updatedAt || new Date().toISOString()
    }
  } catch (error) {
    console.log("[autostatus] config parse failed, resetting:", error.message)
    return saveAutoStatusConfig(false, "system")
  }
}

function saveAutoStatusConfig(enabled, userId) {
  ensureDirs()
  const next = {
    enabled: Boolean(enabled),
    lastUpdatedBy: userId || "unknown",
    updatedAt: new Date().toISOString()
  }

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2))
  return next
}

function extractText(msg) {
  return (
    msg?.message?.conversation ||
    msg?.message?.extendedTextMessage?.text ||
    msg?.message?.imageMessage?.caption ||
    msg?.message?.videoMessage?.caption ||
    msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
    msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text ||
    ""
  )
}

function extractUrl(text) {
  if (!text) return null
  const match = text.match(/https?:\/\/[^\s]+/i)
  return match ? match[0].trim() : null
}

function safeUrl(url) {
  try {
    return new URL(url)
  } catch {
    return null
  }
}

function detectPlatform(url) {
  const parsed = safeUrl(url)
  if (!parsed) return null

  const host = parsed.hostname.toLowerCase()
  const pathname = parsed.pathname.toLowerCase()

  if (SUPPORTED_HOSTS.youtube.some(d => host.endsWith(d))) {
    return pathname.includes("/shorts/") ? "YouTube Shorts" : "YouTube"
  }

  if (SUPPORTED_HOSTS.instagram.some(d => host.endsWith(d))) {
    return pathname.includes("/reel/") ? "Instagram Reels" : "Instagram"
  }

  if (SUPPORTED_HOSTS.facebook.some(d => host.endsWith(d))) {
    return pathname.includes("/reel/") || host === "fb.watch" ? "Facebook Reels" : "Facebook Video"
  }

  if (SUPPORTED_HOSTS.sharechat.some(d => host.endsWith(d))) return "ShareChat"
  if (SUPPORTED_HOSTS.moj.some(d => host.endsWith(d)) || host.includes("moj")) return "Moj"

  return null
}

function isSupportedLink(url) {
  return Boolean(detectPlatform(url))
}

function normalizeMediaResult(result, source) {
  if (!result || typeof result !== "object") return null

  const type = result.type === "image" ? "image" : "video"
  if (!result.url && !result.buffer && !result.filePath) return null

  return {
    type,
    url: result.url,
    buffer: result.buffer,
    filePath: result.filePath,
    mimetype: result.mimetype || (type === "video" ? "video/mp4" : "image/jpeg"),
    source: source || result.source || "unknown"
  }
}

async function fetchFromProvider1(url, platform) {
  // Provider 1: Cobalt API (good for YouTube/Instagram/Facebook)
  const payload = {
    url,
    vCodec: "h264",
    vQuality: "720",
    filenamePattern: "pretty"
  }

  const { data } = await axios.post("https://api.cobalt.tools/api/json", payload, {
    timeout: 18000,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    }
  })

  if (!data) throw new Error("Cobalt empty response")

  if (data.status === "error") {
    throw new Error(`Cobalt error: ${data.text || "unknown"}`)
  }

  const directUrl = data.url || data.download
  if (!directUrl) throw new Error("Cobalt missing direct media URL")

  const isImage = String(data.type || "").toLowerCase().includes("image")

  return normalizeMediaResult({
    type: isImage ? "image" : "video",
    url: directUrl,
    mimetype: isImage ? "image/jpeg" : "video/mp4"
  }, `Provider1-Cobalt (${platform})`)
}

async function fetchFromProvider2(url, platform) {
  // Provider 2: Cobalt API mirror endpoint
  const payload = {
    url,
    videoQuality: "720",
    audioFormat: "mp3"
  }

  const { data } = await axios.post("https://co.wuk.sh/api/json", payload, {
    timeout: 18000,
    headers: {
      "Content-Type": "application/json"
    }
  })

  if (!data || data.status === "error") {
    throw new Error(`Mirror failed: ${data?.text || "unknown"}`)
  }

  const directUrl = data.url || data.download
  if (!directUrl) throw new Error("Mirror missing media URL")

  const isImage = String(data.type || "").toLowerCase().includes("image")
  return normalizeMediaResult({
    type: isImage ? "image" : "video",
    url: directUrl,
    mimetype: isImage ? "image/jpeg" : "video/mp4"
  }, `Provider2-CobaltMirror (${platform})`)
}

function detectTypeFromPath(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
    return { type: "image", mimetype: ext === ".png" ? "image/png" : "image/jpeg" }
  }

  return { type: "video", mimetype: "video/mp4" }
}

async function fetchFromProvider3(url, platform) {
  // Provider 3: yt-dlp universal fallback
  ensureDirs()
  const stamp = `${Date.now()}_${Math.floor(Math.random() * 9999)}`
  const output = path.join(TEMP_DIR, `autostatus_${stamp}.%(ext)s`)

  await ytdlp(url, {
    output,
    noWarnings: true,
    noCheckCertificates: true,
    preferFreeFormats: true,
    format: "bv*+ba/b"
  })

  const files = fs.readdirSync(TEMP_DIR)
    .filter(name => name.startsWith(`autostatus_${stamp}.`))
    .map(name => path.join(TEMP_DIR, name))

  if (!files.length) throw new Error("yt-dlp did not produce a file")

  files.sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)
  const filePath = files[0]
  const byPath = detectTypeFromPath(filePath)

  return normalizeMediaResult({
    type: byPath.type,
    mimetype: byPath.mimetype,
    filePath
  }, `Provider3-ytdlp (${platform})`)
}

async function fetchFromProvider4(url, platform) {
  // Provider 4: yt-dlp in direct URL mode as final recovery
  const stdout = await ytdlp(url, {
    dumpSingleJson: true,
    skipDownload: true,
    noWarnings: true,
    noCheckCertificates: true
  })

  const meta = typeof stdout === "string" ? JSON.parse(stdout) : stdout

  const direct = meta?.url || meta?.requested_downloads?.[0]?.url
  if (!direct) throw new Error("yt-dlp metadata has no direct media URL")

  const isImage = Boolean(meta?.thumbnails?.length) && !meta?.duration
  return normalizeMediaResult({
    type: isImage ? "image" : "video",
    url: direct,
    mimetype: isImage ? "image/jpeg" : "video/mp4"
  }, `Provider4-ytdlp-meta (${platform})`)
}

async function downloadToTemp(url, maxSize, preferredType = "video") {
  ensureDirs()
  const stamp = `${Date.now()}_${Math.floor(Math.random() * 9999)}`
  const ext = preferredType === "image" ? "jpg" : "mp4"
  const filePath = path.join(TEMP_DIR, `autostatus_dl_${stamp}.${ext}`)

  const response = await axios.get(url, {
    responseType: "stream",
    timeout: 30000,
    maxRedirects: 5
  })

  const contentType = String(response.headers["content-type"] || "")
  const contentLength = Number(response.headers["content-length"] || 0)

  if (contentLength && contentLength > maxSize) {
    throw new Error("Media exceeds status size limit")
  }

  let downloaded = 0
  await new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(filePath)

    response.data.on("data", chunk => {
      downloaded += chunk.length
      if (downloaded > maxSize) {
        response.data.destroy(new Error("Media exceeds status size limit"))
      }
    })

    response.data.on("error", reject)
    writer.on("error", reject)
    writer.on("finish", resolve)

    response.data.pipe(writer)
  })

  const fallbackType = contentType.startsWith("image/") ? "image" : "video"
  return {
    filePath,
    mimetype: contentType || (fallbackType === "image" ? "image/jpeg" : "video/mp4"),
    type: fallbackType
  }
}

async function materializeMedia(media) {
  if (media.filePath && fs.existsSync(media.filePath)) {
    return {
      ...media,
      size: fs.statSync(media.filePath).size
    }
  }

  if (media.buffer) {
    ensureDirs()
    const ext = media.type === "image" ? "jpg" : "mp4"
    const filePath = path.join(TEMP_DIR, `autostatus_buf_${Date.now()}.${ext}`)
    fs.writeFileSync(filePath, media.buffer)
    return {
      ...media,
      filePath,
      size: media.buffer.length
    }
  }

  if (media.url) {
    const downloaded = await downloadToTemp(media.url, MAX_STATUS_SIZE, media.type)
    return {
      ...media,
      ...downloaded,
      size: fs.statSync(downloaded.filePath).size
    }
  }

  throw new Error("No media source found")
}

function validateMedia(media) {
  if (!media?.filePath || !fs.existsSync(media.filePath)) {
    return { ok: false, reason: "Unable to access downloaded media" }
  }

  if (media.size > MAX_STATUS_SIZE) {
    return {
      ok: false,
      reason: `Media is too large (${(media.size / 1024 / 1024).toFixed(2)}MB). Max allowed is 15MB for safe status upload.`
    }
  }

  if (!["video", "image"].includes(media.type)) {
    return { ok: false, reason: "Unsupported media type from provider" }
  }

  return { ok: true }
}

function buildCaption(platform) {
  return `🔥 Auto Status by Cobra\n🌐 Source: ${platform}`
}

async function postToStatus(sock, media, sourceLabel, msg) {
  const payload = media.type === "image"
    ? { image: { url: media.filePath }, caption: buildCaption(sourceLabel), mimetype: media.mimetype }
    : { video: { url: media.filePath }, caption: buildCaption(sourceLabel), mimetype: media.mimetype }

  const jidCandidates = [
    msg?.key?.participant,
    msg?.participant,
    msg?.key?.remoteJid
  ].filter(jid => typeof jid === "string" && jid.endsWith("@s.whatsapp.net"))

  const attempts = [
    () => sock.sendMessage("status@broadcast", payload),
    () => sock.sendMessage("status@broadcast", payload, { statusJidList: jidCandidates }),
    () => sock.sendMessage("status@broadcast", payload, { statusJidList: [...new Set(jidCandidates)] })
  ]

  let lastError = null
  for (const attempt of attempts) {
    try {
      await attempt()
      return true
    } catch (error) {
      lastError = error
      console.log("[autostatus] status upload attempt failed:", error?.message || error)
    }
  }

  throw lastError || new Error("Unknown status upload error")
}

async function downloadMediaWithFallback(url, platform, progress = () => {}) {
  const providers = [
    { name: "Provider 1", fn: fetchFromProvider1 },
    { name: "Provider 2", fn: fetchFromProvider2 },
    { name: "Provider 3", fn: fetchFromProvider3 },
    { name: "Provider 4", fn: fetchFromProvider4 }
  ]

  let lastErr = null

  for (let i = 0; i < providers.length; i++) {
    const current = providers[i]

    try {
      if (i > 0) {
        progress(`🧪 Trying fallback server ${i + 1}...`)
      }

      const raw = await current.fn(url, platform)
      const normalized = normalizeMediaResult(raw, current.name)
      if (!normalized) throw new Error("Invalid provider output")

      console.log(`[autostatus] success via ${current.name}`)
      return normalized
    } catch (error) {
      lastErr = error
      console.log(`[autostatus] ${current.name} failed:`, error?.message || error)
    }
  }

  throw lastErr || new Error("All providers failed")
}

function cleanupTemp(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath)
  } catch (error) {
    console.log("[autostatus] cleanup failed:", error.message)
  }
}

async function processAutoStatus({ sock, msg, inputText, silent = false }) {
  const chatId = msg.key.remoteJid

  const url = extractUrl(inputText)
  if (!url) {
    return { ok: false, message: "⚠ No URL found in your message." }
  }

  const parsed = safeUrl(url)
  if (!parsed) {
    return { ok: false, message: "⚠ Invalid URL. Please send a valid link." }
  }

  const platform = detectPlatform(url)
  if (!platform) {
    return { ok: false, message: "❌ Unsupported link. Supported: YouTube, Instagram, Facebook, ShareChat, Moj." }
  }

  if (!silent) await sock.sendMessage(chatId, { text: "🔍 Detecting platform..." }, { quoted: msg })
  if (!silent) await sock.sendMessage(chatId, { text: "📥 Downloading media..." }, { quoted: msg })

  let finalMediaPath = null

  try {
    const downloaded = await downloadMediaWithFallback(url, platform, async (note) => {
      if (!silent) await sock.sendMessage(chatId, { text: note }, { quoted: msg })
    })

    const materialized = await materializeMedia(downloaded)
    finalMediaPath = materialized.filePath

    const validation = validateMedia(materialized)
    if (!validation.ok) {
      return { ok: false, message: `⚠ ${validation.reason}` }
    }

    if (!silent) await sock.sendMessage(chatId, { text: "📤 Uploading to status..." }, { quoted: msg })

    await postToStatus(sock, materialized, platform, msg)

    return { ok: true, message: "✅ Posted to status successfully!" }
  } catch (error) {
    console.log("[autostatus] process failed:", error?.message || error)

    if (String(error?.message || "").toLowerCase().includes("size")) {
      return { ok: false, message: "⚠ Media is too large for WhatsApp status. Try a shorter/lower-quality link." }
    }

    return { ok: false, message: "⚠ Failed to upload media to WhatsApp status." }
  } finally {
    cleanupTemp(finalMediaPath)
  }
}

async function handleAutoStatusMessage(sock, msg, text) {
  try {
    const config = loadAutoStatusConfig()
    if (!config.enabled) return null

    const url = extractUrl(text || extractText(msg))
    if (!url || !isSupportedLink(url)) return null

    console.log("[autostatus] auto trigger detected")

    const result = await processAutoStatus({
      sock,
      msg,
      inputText: text,
      silent: true
    })

    if (!result.ok) {
      await sock.sendMessage(msg.key.remoteJid, {
        text: `⚠ AutoStatus skipped: ${result.message.replace(/^⚠\s*/, "")}`
      }, { quoted: msg })
      return result
    }

    await sock.sendMessage(msg.key.remoteJid, {
      text: "✅ AutoStatus posted this link to status."
    }, { quoted: msg })

    return result
  } catch (error) {
    console.log("[autostatus] auto handler error:", error?.message || error)
    return null
  }
}

module.exports = {
  name: "autostatus",

  async execute(sock, msg, args, user, data, dbPath, analytics) {
    const input = String(args || "").trim()
    const chatId = msg.key.remoteJid
    const text = extractText(msg)

    if (!input) {
      return `📌 *AutoStatus Controls*\n\n• .autostatus on\n• .autostatus off\n• .autostatus status\n• .autostatus <link>\n\nSupported: YouTube, YouTube Shorts, Instagram, Instagram Reels, Facebook Video/Reels, ShareChat, Moj.`
    }

    if (input.toLowerCase() === "on") {
      const config = saveAutoStatusConfig(true, user?.name || "unknown")
      return `✅ AutoStatus enabled.\n\nNow supported links will be auto-posted to status.\nUpdated by: ${config.lastUpdatedBy}`
    }

    if (input.toLowerCase() === "off") {
      const config = saveAutoStatusConfig(false, user?.name || "unknown")
      return `🛑 AutoStatus disabled.\n\nAuto-posting stopped. Manual mode (.autostatus <link>) is still available.\nUpdated by: ${config.lastUpdatedBy}`
    }

    if (input.toLowerCase() === "status") {
      const config = loadAutoStatusConfig()
      return `ℹ AutoStatus is currently *${config.enabled ? "ON" : "OFF"}*\nUpdated by: ${config.lastUpdatedBy}\nAt: ${new Date(config.updatedAt).toLocaleString()}`
    }

    const manualInput = extractUrl(input) ? input : `${input} ${text}`
    const result = await processAutoStatus({
      sock,
      msg,
      inputText: manualInput,
      silent: false
    })

    return result.message
  }
}

module.exports.handleAutoStatusMessage = handleAutoStatusMessage
module.exports.helpers = {
  loadAutoStatusConfig,
  saveAutoStatusConfig,
  extractUrl,
  detectPlatform,
  isSupportedLink,
  downloadMediaWithFallback,
  fetchFromProvider1,
  fetchFromProvider2,
  fetchFromProvider3,
  fetchFromProvider4,
  normalizeMediaResult,
  validateMedia,
  postToStatus,
  buildCaption
}
