const {
    applyTemplate,
    getGroupMetadata,
    getGroupState,
    isAdmin,
    isGroupChat,
    loadGroupDb,
    mentionTag,
    saveGroupDb
} = require("../lib/groupUtils")

const messageCache = new Map()
let schedulerStarted = false
let schedulerSock = null

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
    return (
        msg?.key?.participant ||
        msg?.participant ||
        msg?.key?.remoteJidAlt ||
        msg?.pushName ||
        "Unknown"
    )
}

function cacheMessage(msg) {
    const keyId = msg?.key?.id
    const chatId = msg?.key?.remoteJid

    if (!keyId || !chatId || !isGroupChat(chatId)) {
        return
    }

    messageCache.set(keyId, {
        chatId,
        senderJid: extractSender(msg),
        text: extractText(msg),
        pushName: msg?.pushName || "Unknown",
        type: Object.keys(msg?.message || {})[0] || "text",
        createdAt: Date.now()
    })

    if (messageCache.size > 500) {
        const oldestKey = messageCache.keys().next().value
        messageCache.delete(oldestKey)
    }
}

function matchesLinkMode(text, mode) {
    const content = String(text || "")
    const hasWhatsAppInvite = /chat\.whatsapp\.com\//i.test(content)
    const hasAnyUrl = /https?:\/\/|www\./i.test(content)

    if (mode === "all") {
        return hasAnyUrl
    }

    return hasWhatsAppInvite
}

function findTriggeredFilter(text, filters) {
    const normalized = String(text || "").trim().toLowerCase()
    if (!normalized) {
        return null
    }

    for (const [keyword, response] of Object.entries(filters || {})) {
        if (normalized.includes(keyword.toLowerCase())) {
            return { keyword, response }
        }
    }

    return null
}

async function handleIncomingMessage(sock, msg, text) {
    try {
        cacheMessage(msg)

        if (String(text || "").startsWith(".")) {
            return
        }

        const chatId = msg?.key?.remoteJid
        if (!isGroupChat(chatId)) {
            return
        }

        const { db, group } = getGroupState(chatId)
        const automation = group.automation
        const senderJid = msg?.key?.participant || msg?.participant || ""

        if (automation.antilink?.enabled) {
            const metadata = await getGroupMetadata(sock, chatId)
            const senderIsAdmin = isAdmin(metadata, senderJid)
            const senderIsBot = Boolean(msg?.key?.fromMe)

            if (!senderIsAdmin && !senderIsBot && matchesLinkMode(text, automation.antilink.mode)) {
                automation.antilink.violations[senderJid] = (automation.antilink.violations[senderJid] || 0) + 1
                group.updatedAt = new Date().toISOString()
                saveGroupDb(db)

                try {
                    await sock.sendMessage(chatId, { delete: msg.key })
                } catch (_) {
                    // Delete can fail depending on bot permissions.
                }

                await sock.sendMessage(chatId, {
                    text: `🛡️ *Cobra Antilink Alert*\n\n🚫 Link blocked successfully.\n👤 Offender: ${mentionTag(senderJid)}\n📌 Violations: ${automation.antilink.violations[senderJid]}\n✨ Keep the group clean and premium.`,
                    mentions: [senderJid]
                }, { quoted: msg })

                return
            }
        }

        const matchedFilter = findTriggeredFilter(text, automation.filters)
        if (matchedFilter) {
            await sock.sendMessage(chatId, {
                text: `🤖 *Auto Filter Reply*\n\n🔑 Trigger: ${matchedFilter.keyword}\n💬 ${matchedFilter.response}`
            }, { quoted: msg })
        }
    } catch (err) {
        console.log("GROUP AUTOMATION MESSAGE ERROR:", err)
    }
}

async function handleGroupParticipantsUpdate(sock, update) {
    try {
        const chatId = update?.id
        if (!isGroupChat(chatId)) {
            return
        }

        if (!["add", "remove"].includes(update?.action)) {
            return
        }

        const { group } = getGroupState(chatId)
        const welcome = group.automation?.welcome
        if (!welcome?.enabled) {
            return
        }

        const metadata = await getGroupMetadata(sock, chatId)
        const mentions = update.participants || []
        const memberCount = metadata.participants.length

        for (const jid of mentions) {
            const template = update.action === "add"
                ? welcome.welcomeMessage
                : welcome.goodbyeMessage

            const text = applyTemplate(template, {
                user: mentionTag(jid),
                group: metadata.subject || "this group",
                count: memberCount
            })

            await sock.sendMessage(chatId, {
                text,
                mentions: [jid]
            })
        }
    } catch (err) {
        console.log("GROUP PARTICIPANT UPDATE ERROR:", err)
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

            const { group } = getGroupState(chatId)
            if (!group.automation?.antidelete?.enabled) {
                continue
            }

            const cached = messageCache.get(key.id)
            if (!cached) {
                continue
            }

            const deletedText = cached.text || `📦 Deleted ${cached.type} message.`
            await sock.sendMessage(chatId, {
                text: `🕵️ *Cobra Antidelete Alert*\n\n👤 Sender: ${mentionTag(cached.senderJid)}\n📝 Content: ${deletedText}\n✨ Message recovered while bot was online.`,
                mentions: [cached.senderJid]
            })
        }
    } catch (err) {
        console.log("ANTIDELETE EVENT ERROR:", err)
    }
}

function startScheduledDispatcher(sock) {
    schedulerSock = sock

    if (schedulerStarted) {
        return
    }

    schedulerStarted = true

    setInterval(async () => {
        try {
            const db = loadGroupDb()
            let changed = false
            const now = Date.now()

            for (const [chatId, group] of Object.entries(db.groups || {})) {
                if (!Array.isArray(group?.automation?.schedules) || !group.automation.schedules.length) {
                    continue
                }

                const pending = []

                for (const item of group.automation.schedules) {
                    const runAt = new Date(item.runAt).getTime()
                    if (Number.isNaN(runAt) || runAt > now) {
                        pending.push(item)
                        continue
                    }

                    if (!schedulerSock) {
                        pending.push(item)
                        continue
                    }

                    await schedulerSock.sendMessage(chatId, {
                        text: `⏰ *Scheduled Cobra Drop*\n\n${item.text}\n\n✨ Delivered right on time.`
                    })
                    changed = true
                }

                group.automation.schedules = pending
            }

            if (changed) {
                saveGroupDb(db)
            }
        } catch (err) {
            console.log("SCHEDULE DISPATCH ERROR:", err)
        }
    }, 15000)
}

module.exports = {
    name: "groupautomation",

    async execute(sock, msg, args, user, data, dbPath, analytics) {
        return "⚙️ Group automation runs in the background. Use .antilink, .welcome, .filter, .schedule, or .antidelete."
    },

    handleIncomingMessage,
    handleGroupParticipantsUpdate,
    handleMessageDelete,
    startScheduledDispatcher
}
