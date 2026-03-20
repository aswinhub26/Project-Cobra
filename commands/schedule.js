const {
    canManageGroup,
    getGroupMetadata,
    getGroupState,
    getSenderJid,
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
            runAt: new Date(Date.now() + (amount * msMap[unit])).toISOString(),
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

const HELP_TEXT = `⏰ *COBRA SCHEDULE*\n\n✨ Premium reminder drops for your group.\n\n*Usage:*\n• *.schedule 10m Team meeting starts soon*\n• *.schedule 2h Submit the assignment*\n• *.schedule 2026-03-21 20:00 Launch time*\n• *.schedule list*\n• *.schedule cancel 1*\n\n*Formats:*\n• 10m = minutes\n• 2h = hours\n• 1d = days`

module.exports = {
    name: "schedule",

    async execute(sock, msg, args, user, data, dbPath, analytics) {
        try {
            const chatId = msg.key.remoteJid
            const rawArgs = String(args || "").trim()
            const lower = rawArgs.toLowerCase()

            if (!isGroupChat(chatId)) {
                return "❌ This command works only in groups"
            }

            const metadata = await getGroupMetadata(sock, chatId)
            const senderJid = getSenderJid(msg)

            if (!canManageGroup(metadata, senderJid, user)) {
                return "🛡️ Only group admins or the owner can use this command"
            }

            const { db, group } = getGroupState(chatId)
            const schedules = group.automation.schedules

            if (!rawArgs || lower === "help") {
                return HELP_TEXT
            }

            if (lower === "list") {
                if (!schedules.length) {
                    return "📭 No scheduled messages yet."
                }

                return `⏰ *Scheduled Messages*\n\n${schedules.map((item) => `#${item.id} • ${new Date(item.runAt).toLocaleString()}\n${item.text}`).join("\n\n")}`
            }

            if (lower.startsWith("cancel ")) {
                const id = Number(rawArgs.slice(7).trim())
                const index = schedules.findIndex((item) => item.id === id)

                if (index === -1) {
                    return "⚠️ Schedule ID not found"
                }

                schedules.splice(index, 1)
                group.updatedAt = new Date().toISOString()
                saveGroupDb(db)
                return `🗑️ Scheduled message #${id} cancelled successfully.`
            }

            const parsed = parseRunAt(rawArgs)
            if (!parsed || !parsed.text) {
                return HELP_TEXT
            }

            const runTime = new Date(parsed.runAt)
            if (Number.isNaN(runTime.getTime()) || runTime.getTime() <= Date.now()) {
                return "⚠️ Please choose a future date or duration for the schedule."
            }

            const nextId = schedules.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1
            schedules.push({
                id: nextId,
                text: parsed.text,
                runAt: runTime.toISOString(),
                createdBy: senderJid,
                createdAt: new Date().toISOString()
            })

            group.updatedAt = new Date().toISOString()
            saveGroupDb(db)

            return `⏰ Scheduled message saved successfully.\n\n• ID: ${nextId}\n• Time: ${runTime.toLocaleString()}\n• Message: ${parsed.text}`
        } catch (err) {
            console.log("SCHEDULE ERROR:", err)
            return "⚠️ Failed to schedule the message"
        }
    }
}
