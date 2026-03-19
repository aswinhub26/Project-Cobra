const fs = require("fs")
const path = require("path")
const settings = require("../settings")

const GROUP_DB_PATH = path.join(__dirname, "..", "database", "groups.json")

function ensureGroupDb() {
    const dbDir = path.dirname(GROUP_DB_PATH)

    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })

    if (!fs.existsSync(GROUP_DB_PATH)) {
        fs.writeFileSync(GROUP_DB_PATH, JSON.stringify({ groups: {} }, null, 2))
    }
}

function loadGroupDb() {
    ensureGroupDb()

    try {
        const parsed = JSON.parse(fs.readFileSync(GROUP_DB_PATH, "utf-8"))

        if (!parsed || typeof parsed !== "object") {
            return { groups: {} }
        }

        if (!parsed.groups || typeof parsed.groups !== "object") {
            parsed.groups = {}
        }

        return parsed
    } catch {
        return { groups: {} }
    }
}

function saveGroupDb(data) {
    ensureGroupDb()
    fs.writeFileSync(GROUP_DB_PATH, JSON.stringify(data, null, 2))
    return data
}

function getGroupState(groupId) {
    const db = loadGroupDb()

    if (!db.groups[groupId]) {
        db.groups[groupId] = {
            warnings: {},
            muted: false,
            updatedAt: new Date().toISOString()
        }

        saveGroupDb(db)
    }

    return {
        db,
        group: db.groups[groupId]
    }
}

function normalizeJid(jid) {
    if (!jid || typeof jid !== "string") return ""

    const [local = "", domain = ""] = jid.split("@")
    const cleanLocal = local.split(":")[0]

    return domain ? `${cleanLocal}@${domain}` : cleanLocal
}

function digitsOnly(value) {
    return String(value || "").replace(/\D/g, "")
}

function getOwnerDigits() {
    return digitsOnly(settings.owner?.[0])
}

function getSenderJid(msg) {
    return normalizeJid(
        msg?.key?.participant ||
        msg?.participant ||
        msg?.key?.remoteJid ||
        ""
    )
}

function getBotJid(sock) {
    return normalizeJid(sock?.user?.id || "")
}

function getQuotedParticipant(msg) {
    return normalizeJid(
        msg?.message?.extendedTextMessage?.contextInfo?.participant ||
        msg?.message?.imageMessage?.contextInfo?.participant ||
        msg?.message?.videoMessage?.contextInfo?.participant ||
        ""
    )
}

function getMentionedJids(msg) {
    const sources = [
        msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid,
        msg?.message?.imageMessage?.contextInfo?.mentionedJid,
        msg?.message?.videoMessage?.contextInfo?.mentionedJid
    ]

    const mentions = sources.find(Array.isArray) || []
    return mentions.map(normalizeJid).filter(Boolean)
}

function getTargetJid(msg) {
    const mentions = getMentionedJids(msg)
    if (mentions.length) return mentions[0]

    const quoted = getQuotedParticipant(msg)
    if (quoted) return quoted

    return ""
}

function cleanTargetArg(args) {
    return String(args || "")
        .replace(/@\d+/g, "")
        .trim()
}

async function getGroupMetadata(sock, chatId) {
    return sock.groupMetadata(chatId)
}

function getParticipantMap(metadata) {
    const participants = metadata?.participants || []

    return participants.reduce((acc, participant) => {
        acc[normalizeJid(participant.id)] = participant
        return acc
    }, {})
}

function isGroupChat(chatId) {
    return String(chatId || "").endsWith("@g.us")
}

function isAdmin(metadata, jid) {
    const participant = getParticipantMap(metadata)[normalizeJid(jid)]
    return ["admin", "superadmin"].includes(participant?.admin)
}

function isOwnerJid(jid) {
    const senderDigits = digitsOnly(normalizeJid(jid))
    const ownerDigits = getOwnerDigits()

    return Boolean(senderDigits && ownerDigits && senderDigits === ownerDigits)
}

function canManageGroup(metadata, jid, user) {
    return isOwnerJid(jid) || isAdmin(metadata, jid) || user?.role === "owner"
}

function participantName(metadata, jid) {
    const participant = getParticipantMap(metadata)[normalizeJid(jid)]

    return (
        participant?.notify ||
        participant?.verifiedName ||
        `@${digitsOnly(jid) || "user"}`
    )
}

function mentionTag(jid) {
    const digits = digitsOnly(jid)
    return digits ? `@${digits}` : "@user"
}

function buildMentionLine(metadata, jid) {
    return `• ${mentionTag(jid)} ${participantName(metadata, jid)}`
}

function listAdminJids(metadata) {
    return (metadata?.participants || [])
        .filter((participant) => ["admin", "superadmin"].includes(participant.admin))
        .map((participant) => normalizeJid(participant.id))
}

function ensureWarnEntry(group, targetJid) {
    if (!group.warnings[targetJid]) {
        group.warnings[targetJid] = {
            count: 0,
            reasons: [],
            updatedAt: new Date().toISOString()
        }
    }

    return group.warnings[targetJid]
}

module.exports = {
    GROUP_DB_PATH,
    buildMentionLine,
    canManageGroup,
    cleanTargetArg,
    ensureWarnEntry,
    getBotJid,
    getGroupMetadata,
    getGroupState,
    getMentionedJids,
    getParticipantMap,
    getQuotedParticipant,
    getSenderJid,
    getTargetJid,
    isAdmin,
    isGroupChat,
    listAdminJids,
    mentionTag,
    normalizeJid,
    participantName,
    saveGroupDb
}
