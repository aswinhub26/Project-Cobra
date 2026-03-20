const {
    canManageGroup,
    getGroupMetadata,
    getGroupState,
    isGroupChat,
    saveGroupDb
} = require("../lib/groupUtils")

function parseRunAt(input) {
    const value = String(input || "").trim()

    const relative = value.match(/^(\d+)(m|h|d)\s+([\s\S]+)$/i)
    if (relative) {
        const amount = Number(relative[1])
        const unit = relative[2].toLowerCase()
        const text = relative[3].trim()

        const msMap = { m: 60000, h: 3600000, d: 86400000 }

        return {
            runAt: new Date(Date.now() + amount * msMap[unit]).toISOString(),
            text
        }
    }

    const absolute = value.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s+([\s\S]+)$/)
    if (absolute) {
        const iso = new Date(`${absolute[1]}T${absolute[2]}:00`).toISOString()

        return {
            runAt: iso,
            text: absolute[3].trim()
        }
    }

    return null
}

const HELP_TEXT = `⏰ *COBRA SCHEDULE*

✨ Smart reminder system for your group

📌 Usage:
• *.schedule 10m Meeting starts soon*
• *.schedule 2h Submit assignment*
• *.schedule 2026-03-21 20:00 Launch event*
• *.schedule list*
• *.schedule cancel 1*

⏳ Time formats:
• 10m → minutes
• 2h → hours
• 1d → days`

module.exports = {
    name: "schedule",

    async execute(sock, msg, args, user, data, dbPath, analytics) {
        try {
            const chatId = msg.key.remoteJid
            const senderJid = msg.key.participant || msg.key.remoteJid
            const rawArgs = String(args || "").trim()
            const lower = rawArgs.toLowerCase()

            if (!isGroupChat(chatId)) {
                return "❌ This command works only in groups"
            }

            const metadata = await getGroupMetadata(sock, chatId)

            if (!canManageGroup(metadata, senderJid, user)) {
                return "🛡️ Only admins can use this command"
            }

            const { db, group } = getGroupState(chatId)
            const schedules = group.automation.schedules

            // HELP
            if (!rawArgs || lower === "help") {
                return HELP_TEXT
            }

            // LIST
            if (lower === "list") {
                if (!schedules.length) {
                    return "📭 No scheduled messages yet"
                }

                return `⏰ *Scheduled Messages*

${schedules.map(item =>
    `#${item.id}
🕒 ${new Date(item.runAt).toLocaleString()}
💬 ${item.text}`
).join("\n\n")}`
            }

            // CANCEL
            if (lower.startsWith("cancel ")) {
                const id = Number(rawArgs.slice(7).trim())
                const index = schedules.findIndex(item => item.id === id)

                if (index === -1) {
                    return "⚠️ Schedule ID not found"
                }

                schedules.splice(index, 1)
                group.updatedAt = new Date().toISOString()
                saveGroupDb(db)

                return `🗑️ Schedule #${id} cancelled`
            }

            // CREATE
            const parsed = parseRunAt(rawArgs)

            if (!parsed || !parsed.text) {
                return HELP_TEXT
            }

            const runTime = new Date(parsed.runAt)

            if (Number.isNaN(runTime.getTime()) || runTime <= new Date()) {
                return "⚠️ Please choose a future time"
            }

            const nextId =
                schedules.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1

            schedules.push({
                id: nextId,
                text: parsed.text,
                runAt: runTime.toISOString(),
                createdBy: senderJid,
                createdAt: new Date().toISOString()
            })

            group.updatedAt = new Date().toISOString()
            saveGroupDb(db)

            return `⏰ *Schedule Created*

🆔 ID: ${nextId}
🕒 Time: ${runTime.toLocaleString()}
💬 Message: ${parsed.text}`
        } catch (err) {
            console.log("SCHEDULE ERROR:", err)
            return "⚠️ Failed to schedule message"
        }
    }
}