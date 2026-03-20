const {
    applyTemplate,
    getGroupConfig,
    getGroupMetadata,
    isAdmin,
    isGroupChat,
    loadStore,
    mentionTag,
    saveStore
} = require("../lib/groupAutomationStore")

const messageCache = new Map()
let currentSock = null
let schedulerStarted = false

function extractText(msg) {
    return (
        msg?.message?.conversation ||
        msg?.message?.extendedTextMessage?.text ||
        msg?.message?.imageMessage?.caption ||
        msg?.message?.videoMessage?.caption ||
        msg?.message?.documentMessage?.caption ||
        ""
    )
}

function extractSender(msg) {
    return msg?.key?.participant || msg?.participant || msg?.key?.remoteJidAlt || ""
}

function cacheGroupMessage(msg) {
    const chatId = msg?.key?.remoteJid
    const keyId = msg?.key?.id

    if (!chatId || !keyId || !isGroupChat(chatId)) {
        return
    }

    messageCache.set(keyId, {
        chatId,
        senderJid: extractSender(msg),
        text: extractText(msg),
        type: Object.keys(msg?.message || {})[0] || "text",
        createdAt: Date.now()
    })

    if (messageCache.size > 500) {
        const oldestKey = messageCache.keys().next().value
        messageCache.delete(oldestKey)
    }
}

function matchesLink(text, mode) {
    const value = String(text || "")
    const hasWhatsAppInvite = /chat\.whatsapp\.com\//i.test(value)
    const hasUrl = /https?:\/\/|www\./i.test(value)

    return mode === "all" ? hasUrl : hasWhatsAppInvite
}

function findFilter(text, filters) {
    const value = String(text || "").trim().toLowerCase()
    if (!value) {
        return null
    }

    for (const [keyword, reply] of Object.entries(filters || {})) {
        if (value.includes(keyword.toLowerCase())) {
            return { keyword, reply }
        }
    }

    return null
}

async function handleIncomingMessage(sock, msg, text) {
    try {
        cacheGroupMessage(msg)

        if (String(text || "").startsWith(".")) {
            return
        }

        const chatId = msg?.key?.remoteJid
        if (!isGroupChat(chatId)) {
            return
        }

        const { db, group } = getGroupConfig(chatId)
        const senderJid = extractSender(msg)

        if (group.antilink.enabled) {
            const metadata = await getGroupMetadata(sock, chatId)
            if (!isAdmin(metadata, senderJid) && !msg?.key?.fromMe && matchesLink(text, group.antilink.mode)) {
                group.antilink.violations[senderJid] = (group.antilink.violations[senderJid] || 0) + 1
                group.updatedAt = new Date().toISOString()
                saveStore(db)

                try {
                    await sock.sendMessage(chatId, { delete: msg.key })
                } catch (_) {
                    // Deletion depends on bot rights.
                }

                await sock.sendMessage(chatId, {
                    text: `🛡️ *Cobra Antilink Alert*\n\n🚫 Link blocked successfully.\n👤 Offender: ${mentionTag(senderJid)}\n📌 Violations: ${group.antilink.violations[senderJid]}\n✨ Keep the group premium and clean.`,
                    mentions: [senderJid]
                }, { quoted: msg })
                return
            }
        }

        const matched = findFilter(text, group.filters)
        if (matched) {
            await sock.sendMessage(chatId, {
                text: `🤖 *Auto Filter Reply*\n\n🔑 Trigger: ${matched.keyword}\n💬 ${matched.reply}`
            }, { quoted: msg })
        }
    } catch (err) {
        console.log("GROUP AUTOMATION MESSAGE ERROR:", err)
    }
}

async function handleGroupParticipantsUpdate(sock, update) {
    try {
        const chatId = update?.id
        if (!isGroupChat(chatId) || !["add", "remove"].includes(update?.action)) {
            return
        }

        const { group } = getGroupConfig(chatId)
        if (!group.welcome.enabled) {
            return
        }

        const metadata = await getGroupMetadata(sock, chatId)
        const count = metadata.participants.length

        for (const jid of update.participants || []) {
            const template = update.action === "add" ? group.welcome.welcomeMessage : group.welcome.goodbyeMessage
            const text = applyTemplate(template, {
                user: mentionTag(jid),
                group: metadata.subject || "this group",
                count
            })

            await sock.sendMessage(chatId, {
                text,
                mentions: [jid]
            })
        }
    } catch (err) {
        console.log("GROUP AUTOMATION PARTICIPANT ERROR:", err)
    }
}

async function handleMessageDelete(sock, payload) {
    try {
        const keys = payload?.keys || (payload?.key ? [payload.key] : [])

        for (const key of keys) {
            const chatId = key?.remoteJid
            if (!isGroupChat(chatId)) {
                continue
            }

            const { group } = getGroupConfig(chatId)
            if (!group.antidelete.enabled) {
                continue
            }

            const cached = messageCache.get(key.id)
            if (!cached) {
                continue
            }

            await sock.sendMessage(chatId, {
                text: `🕵️ *Cobra Antidelete Alert*\n\n👤 Sender: ${mentionTag(cached.senderJid)}\n📝 Content: ${cached.text || `Deleted ${cached.type} message.`}\n✨ Message recovered while the bot was online.`,
                mentions: [cached.senderJid]
            })
        }
    } catch (err) {
        console.log("GROUP AUTOMATION DELETE ERROR:", err)
    }
}

function startScheduler(sock) {
    currentSock = sock

    if (schedulerStarted) {
        return
    }

    schedulerStarted = true

    setInterval(async () => {
        try {
            const db = loadStore()
            let changed = false
            const now = Date.now()

            for (const [chatId, group] of Object.entries(db.groups || {})) {
                if (!Array.isArray(group.schedules) || !group.schedules.length) {
                    continue
                }

                const pending = []

                for (const item of group.schedules) {
                    const runAt = new Date(item.runAt).getTime()
                    if (Number.isNaN(runAt) || runAt > now || !currentSock) {
                        pending.push(item)
                        continue
                    }

                    await currentSock.sendMessage(chatId, {
                        text: `⏰ *Scheduled Cobra Drop*\n\n${item.text}\n\n✨ Delivered right on time.`
                    })
                    changed = true
                }

                group.schedules = pending
            }

            if (changed) {
                saveStore(db)
            }
        } catch (err) {
            console.log("GROUP AUTOMATION SCHEDULER ERROR:", err)
        }
    }, 15000)
}

module.exports = {
    name: "groupautomation",

    async execute(sock, msg, args, user, data, dbPath, analytics) {
        return "⚙️ Group automation runs in the background. Use .antilink, .welcome, .filter, .schedule, or .antidelete."
    },

    handleGroupParticipantsUpdate,
    handleIncomingMessage,
    handleMessageDelete,
    startScheduler
}
