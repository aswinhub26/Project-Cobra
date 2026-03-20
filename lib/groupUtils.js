const fs = require("fs")
const path = require("path")

const DB_PATH = path.join(__dirname, "..", "database", "groups.json")

// 📦 Load DB
function loadDb() {
    try {
        if (!fs.existsSync(DB_PATH)) {
            fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2))
        }
        return JSON.parse(fs.readFileSync(DB_PATH))
    } catch {
        return {}
    }
}

// 💾 Save DB
function saveGroupDb(db) {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2))
}

// 👥 Get metadata
async function getGroupMetadata(sock, chatId) {
    try {
        return await sock.groupMetadata(chatId)
    } catch {
        return {}
    }
}

// 🧠 Check group
function isGroupChat(jid) {
    return jid?.endsWith("@g.us")
}

// 🛡 Admin list
function listAdminJids(metadata) {
    return (metadata?.participants || [])
        .filter(p => p.admin)
        .map(p => p.id)
}

// 👑 Check if user can manage
function canManageGroup(metadata, sender, user) {
    const admins = listAdminJids(metadata)
    return admins.includes(sender) || sender === user
}

// 🏷 Mention
function mentionTag(jid) {
    return `@${jid.split("@")[0]}`
}

// 👤 Name
function participantName(metadata, jid) {
    const user = metadata?.participants?.find(p => p.id === jid)
    return user?.notify || user?.name || jid.split("@")[0]
}

// 📊 Group state
function getGroupState(chatId) {
    const db = loadDb()

    if (!db[chatId]) {
        db[chatId] = {
            automation: {
                schedules: []
            },
            createdAt: new Date().toISOString()
        }
    }

    return {
        db,
        group: db[chatId]
    }
}

module.exports = {
    getGroupMetadata,
    isGroupChat,
    listAdminJids,
    mentionTag,
    participantName,
    getGroupState,
    saveGroupDb,
    canManageGroup
}