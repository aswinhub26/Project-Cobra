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
        msg?.key?.remoteJidAlt ||
        msg?.key?.remoteJid ||
        ""
    )
}

function uniqueJids(values) {
    return [...new Set(
        values
            .map((value) => normalizeJid(value))
            .filter(Boolean)
    )]
}

function getBotJids(sock, msg) {
    return uniqueJids([
        sock?.user?.id,
        sock?.user?.lid,
        sock?.user?.jid,
        sock?.authState?.creds?.me?.id,
        msg?.key?.participant,
        msg?.participant,
        msg?.key?.remoteJidAlt,
        msg?.key?.fromMe ? msg?.key?.remoteJid : ""
    ])
}

function getBotJid(sock, msg) {
    return getBotJids(sock, msg)[0] || ""
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
function getBotJid(sock) {
    return normalizeJid(sock?.user?.id || "")
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
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

function sameUserJid(left, right) {
    const normalizedLeft = normalizeJid(left)
    const normalizedRight = normalizeJid(right)

    if (!normalizedLeft || !normalizedRight) return false
    if (normalizedLeft === normalizedRight) return true

    const leftDigits = digitsOnly(normalizedLeft)
    const rightDigits = digitsOnly(normalizedRight)

    return Boolean(leftDigits && rightDigits && leftDigits === rightDigits)
}

function matchesAnyJid(candidate, jids) {
    const list = Array.isArray(jids) ? jids : [jids]
    return list.some((jid) => sameUserJid(candidate, jid))
}

function findParticipant(metadata, jid) {
    return (metadata?.participants || []).find((participant) =>
        matchesAnyJid(participant.id, jid) ||
        matchesAnyJid(participant.jid, jid) ||
        matchesAnyJid(participant.lid, jid)
    ) || null
}

function resolveParticipantJid(metadata, jid) {
    const participant = findParticipant(metadata, jid)

    if (!participant) return normalizeJid(jid)

    return normalizeJid(
        participant.id ||
        participant.jid ||
        participant.lid ||
        jid
    )
}

function isGroupChat(chatId) {
    return String(chatId || "").endsWith("@g.us")
}

function isAdmin(metadata, jid) {
    const participant = findParticipant(metadata, jid)
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
    const participant = getParticipantMap(metadata)[normalizeJid(jid)]
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
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
    const participant = findParticipant(metadata, jid)
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
    const participant = getParticipantMap(metadata)[normalizeJid(jid)]
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs

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
    findParticipant,
    getBotJid,
    getBotJids,
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
    getBotJid,
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
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
    matchesAnyJid,
    normalizeJid,
    participantName,
    resolveParticipantJid,
    saveGroupDb,
    sameUserJid
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
    normalizeJid,
    participantName,
    saveGroupDb
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
}
