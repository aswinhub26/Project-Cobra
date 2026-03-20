const fs = require("fs")
const path = require("path")
const settings = require("../settings")

const GROUP_DB_PATH = path.join(__dirname, "..", "database", "groups.json")
const DEFAULT_WARN_LIMIT = 3
const DEFAULT_WELCOME_MESSAGE = "🎉 Welcome {user} to *{group}*!\n👥 Member #{count}\n🐍 Enjoy your stay with Project Cobra."
const DEFAULT_GOODBYE_MESSAGE = "👋 Goodbye {user}\n🐍 We will miss you in *{group}*."

function ensureGroupDb() {
    const dbDir = path.dirname(GROUP_DB_PATH)

    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true })
    }

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
    } catch (err) {
        console.log("GROUP DB LOAD ERROR:", err.message)
        return { groups: {} }
    }
}

function saveGroupDb(data) {
    ensureGroupDb()
    fs.writeFileSync(GROUP_DB_PATH, JSON.stringify(data, null, 2))
    return data
}

function createDefaultGroupState() {
    return {
        warnings: {},
        muted: false,
        automation: {
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
            antidelete: {
                enabled: false
            },
            filters: {},
            schedules: []
        },
        updatedAt: new Date().toISOString()
    }
}

function ensureAutomationState(group) {
    if (!group.automation || typeof group.automation !== "object") {
        group.automation = {}
    }

    if (!group.automation.antilink || typeof group.automation.antilink !== "object") {
        group.automation.antilink = {
            enabled: false,
            mode: "whatsapp",
            violations: {}
        }
    }

    if (!group.automation.antilink.violations || typeof group.automation.antilink.violations !== "object") {
        group.automation.antilink.violations = {}
    }

    if (!group.automation.welcome || typeof group.automation.welcome !== "object") {
        group.automation.welcome = {
            enabled: false,
            welcomeMessage: DEFAULT_WELCOME_MESSAGE,
            goodbyeMessage: DEFAULT_GOODBYE_MESSAGE
        }
    }

    if (!group.automation.welcome.welcomeMessage) {
        group.automation.welcome.welcomeMessage = DEFAULT_WELCOME_MESSAGE
    }

    if (!group.automation.welcome.goodbyeMessage) {
        group.automation.welcome.goodbyeMessage = DEFAULT_GOODBYE_MESSAGE
    }

    if (!group.automation.antidelete || typeof group.automation.antidelete !== "object") {
        group.automation.antidelete = {
            enabled: false
        }
    }

    if (!group.automation.filters || typeof group.automation.filters !== "object") {
        group.automation.filters = {}
    }

    if (!Array.isArray(group.automation.schedules)) {
        group.automation.schedules = []
    }

    return group.automation
}

function getGroupState(groupId) {
    const db = loadGroupDb()

    if (!db.groups[groupId]) {
        db.groups[groupId] = createDefaultGroupState()
        saveGroupDb(db)
    }

    const group = db.groups[groupId]

    if (!group.warnings || typeof group.warnings !== "object") {
        group.warnings = {}
    }

    ensureAutomationState(group)

    return {
        db,
        group
    }
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

function uniqueJids(values) {
    return [...new Set(
        (Array.isArray(values) ? values : [values])
            .map((value) => normalizeJid(value))
            .filter(Boolean)
    )]
}

function getOwnerDigits() {
    return digitsOnly(settings.owner?.[0])
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

function getBotJids(sock, msg) {
    return uniqueJids([
        sock?.user?.id,
        sock?.user?.jid,
        sock?.authState?.creds?.me?.id,
        msg?.key?.fromMe ? msg?.key?.remoteJidAlt : "",
        msg?.key?.fromMe ? msg?.key?.remoteJid : ""
    ])
}

function getBotJid(sock, msg) {
    return getBotJids(sock, msg)[0] || ""
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
    return uniqueJids(mentions)
}

function getTargetJid(msg) {
    const mentioned = getMentionedJids(msg)
    if (mentioned.length) {
        return mentioned[0]
    }

    const quoted = getQuotedParticipant(msg)
    if (quoted) {
        return quoted
    }

    return ""
}

function cleanTargetArg(args) {
    return String(args || "")
        .replace(/@\d+/g, "")
        .trim()
}

function isGroupChat(chatId) {
    return String(chatId || "").endsWith("@g.us")
}

async function getGroupMetadata(sock, chatId) {
    const metadata = await sock.groupMetadata(chatId)

    if (!metadata || typeof metadata !== "object") {
        return {
            id: chatId,
            subject: "Unknown Group",
            participants: []
        }
    }

    if (!Array.isArray(metadata.participants)) {
        metadata.participants = []
    }

    return metadata
}

function sameUserJid(left, right) {
    const a = normalizeJid(left)
    const b = normalizeJid(right)

    if (!a || !b) {
        return false
    }

    if (a === b) {
        return true
    }

    const aDigits = digitsOnly(a)
    const bDigits = digitsOnly(b)

    return Boolean(aDigits && bDigits && aDigits === bDigits)
}

function matchesAnyJid(candidate, jids) {
    const list = Array.isArray(jids) ? jids : [jids]
    return list.some((jid) => sameUserJid(candidate, jid))
}

function findParticipant(metadata, jid) {
    return (metadata?.participants || []).find((participant) =>
        matchesAnyJid(participant?.id, jid) ||
        matchesAnyJid(participant?.jid, jid) ||
        matchesAnyJid(participant?.lid, jid)
    ) || null
}

function resolveParticipantJid(metadata, jid) {
    const participant = findParticipant(metadata, jid)

    if (!participant) {
        return normalizeJid(jid)
    }

    return normalizeJid(
        participant.id ||
        participant.jid ||
        participant.lid ||
        jid
    )
}

function isAdmin(metadata, jidOrJids) {
    const list = Array.isArray(jidOrJids) ? jidOrJids : [jidOrJids]

    return list.some((jid) => {
        const participant = findParticipant(metadata, jid)
        return ["admin", "superadmin"].includes(participant?.admin)
    })
}

function isOwnerJid(jid) {
    const senderDigits = digitsOnly(jid)
    const ownerDigits = getOwnerDigits()
    return Boolean(senderDigits && ownerDigits && senderDigits === ownerDigits)
}

function canManageGroup(metadata, jid, user) {
    return isOwnerJid(jid) || isAdmin(metadata, jid) || user?.role === "owner"
}

function mentionTag(jid) {
    const digits = digitsOnly(jid)
    return digits ? `@${digits}` : "@user"
}

function participantName(metadata, jid) {
    const participant = findParticipant(metadata, jid)

    return (
        participant?.notify ||
        participant?.verifiedName ||
        participant?.name ||
        mentionTag(jid)
    )
}

function buildMentionLine(metadata, jid) {
    return `• ${mentionTag(jid)} ${participantName(metadata, jid)}`
}

function listAdminJids(metadata) {
    return (metadata?.participants || [])
        .filter((participant) => ["admin", "superadmin"].includes(participant?.admin))
        .map((participant) => normalizeJid(participant.id || participant.jid || participant.lid))
        .filter(Boolean)
}

function ensureWarnEntry(group, targetJid) {
    if (!group.warnings[targetJid]) {
        group.warnings[targetJid] = {
            count: 0,
            reasons: [],
            updatedAt: new Date().toISOString()
        }
    }

    if (!Array.isArray(group.warnings[targetJid].reasons)) {
        group.warnings[targetJid].reasons = []
    }

    return group.warnings[targetJid]
}

function applyTemplate(template, values) {
    let text = String(template || "")

    for (const [key, value] of Object.entries(values || {})) {
        const safeValue = String(value ?? "")
        text = text.replace(new RegExp(`\\{${key}\\}`, "gi"), safeValue)
    }

    return text
}

module.exports = {
    DEFAULT_GOODBYE_MESSAGE,
    DEFAULT_WELCOME_MESSAGE,
    DEFAULT_WARN_LIMIT,
    GROUP_DB_PATH,
    applyTemplate,
    buildMentionLine,
    canManageGroup,
    cleanTargetArg,
    createDefaultGroupState,
    digitsOnly,
    ensureAutomationState,
    ensureWarnEntry,
    findParticipant,
    getBotJid,
    getBotJids,
    getGroupMetadata,
    getGroupState,
    getMentionedJids,
    getQuotedParticipant,
    getSenderJid,
    getTargetJid,
    isAdmin,
    isGroupChat,
    isOwnerJid,
    listAdminJids,
    loadGroupDb,
    matchesAnyJid,
    mentionTag,
    normalizeJid,
    participantName,
    resolveParticipantJid,
    saveGroupDb,
    sameUserJid,
    uniqueJids
}
