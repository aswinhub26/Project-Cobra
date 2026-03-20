const fs = require("fs")
const path = require("path")
const settings = require("../settings")

const STORE_PATH = path.join(__dirname, "..", "database", "group-automation.json")
const DEFAULT_WELCOME_MESSAGE = "🎉 Welcome {user} to *{group}*!\n👥 Member #{count}\n🐍 Powered by Project Cobra Premium."
const DEFAULT_GOODBYE_MESSAGE = "👋 Goodbye {user}\n🐍 We will miss you in *{group}*."

function ensureStore() {
    const dir = path.dirname(STORE_PATH)
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
    }

    if (!fs.existsSync(STORE_PATH)) {
        fs.writeFileSync(STORE_PATH, JSON.stringify({ groups: {} }, null, 2))
    }
}

function loadStore() {
    ensureStore()

    try {
        const parsed = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"))
        if (!parsed || typeof parsed !== "object") {
            return { groups: {} }
        }

        if (!parsed.groups || typeof parsed.groups !== "object") {
            parsed.groups = {}
        }

        return parsed
    } catch (err) {
        console.log("GROUP AUTOMATION STORE LOAD ERROR:", err.message)
        return { groups: {} }
    }
}

function saveStore(data) {
    ensureStore()
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2))
    return data
}

function createGroupConfig() {
    return {
        antilink: {
            enabled: false,
            mode: "whatsapp",
            violations: {}
        },
        welcome: {
            enabled: false,
            welcomeMessage: DEFAULT_WELCOME_MESSAGE,
            goodbyeMessage: DEFAULT_GOODBYE_MESSAGE
        },
        filters: {},
        schedules: [],
        antidelete: {
            enabled: false
        },
        updatedAt: new Date().toISOString()
    }
}

function getGroupConfig(chatId) {
    const db = loadStore()

    if (!db.groups[chatId]) {
        db.groups[chatId] = createGroupConfig()
        saveStore(db)
    }

    const group = db.groups[chatId]

    if (!group.antilink) {
        group.antilink = createGroupConfig().antilink
    }

    if (!group.welcome) {
        group.welcome = createGroupConfig().welcome
    }

    if (!group.filters || typeof group.filters !== "object") {
        group.filters = {}
    }

    if (!Array.isArray(group.schedules)) {
        group.schedules = []
    }

    if (!group.antidelete) {
        group.antidelete = { enabled: false }
    }

    return { db, group }
}

function normalizeJid(jid) {
    if (!jid || typeof jid !== "string") {
        return ""
    }

    const [local = "", domain = ""] = jid.split("@")
    const cleanLocal = local.split(":")[0]
    return domain ? `${cleanLocal}@${domain}` : cleanLocal
}

function digitsOnly(value) {
    return String(value || "").replace(/\D/g, "")
}

function mentionTag(jid) {
    const digits = digitsOnly(jid)
    return digits ? `@${digits}` : "@user"
}

function getSenderJid(msg) {
    return normalizeJid(
        msg?.key?.participant ||
        msg?.participant ||
        msg?.key?.remoteJidAlt ||
        msg?.key?.remoteJid ||
        ""
    )
}

function isGroupChat(chatId) {
    return String(chatId || "").endsWith("@g.us")
}

function sameUser(left, right) {
    const a = digitsOnly(normalizeJid(left))
    const b = digitsOnly(normalizeJid(right))
    return Boolean(a && b && a === b)
}

async function getGroupMetadata(sock, chatId) {
    const metadata = await sock.groupMetadata(chatId)
    if (!metadata || typeof metadata !== "object") {
        return { id: chatId, subject: "Unknown Group", participants: [] }
    }

    if (!Array.isArray(metadata.participants)) {
        metadata.participants = []
    }

    return metadata
}

function findParticipant(metadata, jid) {
    return (metadata?.participants || []).find((participant) =>
        sameUser(participant?.id, jid) ||
        sameUser(participant?.jid, jid) ||
        sameUser(participant?.lid, jid)
    ) || null
}

function isAdmin(metadata, jid) {
    const participant = findParticipant(metadata, jid)
    return ["admin", "superadmin"].includes(participant?.admin)
}

function isOwnerJid(jid) {
    return sameUser(jid, settings.owner?.[0])
}

function canManageGroup(metadata, jid, user) {
    return isOwnerJid(jid) || isAdmin(metadata, jid) || user?.role === "owner"
}

function applyTemplate(template, values) {
    let output = String(template || "")

    for (const [key, value] of Object.entries(values || {})) {
        output = output.replace(new RegExp(`\\{${key}\\}`, "gi"), String(value ?? ""))
    }

    return output
}

module.exports = {
    DEFAULT_GOODBYE_MESSAGE,
    DEFAULT_WELCOME_MESSAGE,
    STORE_PATH,
    applyTemplate,
    canManageGroup,
    digitsOnly,
    getGroupConfig,
    getGroupMetadata,
    loadStore,
    getSenderJid,
    isAdmin,
    isGroupChat,
    mentionTag,
    normalizeJid,
    saveStore
}
