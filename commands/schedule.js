const {
    canManageGroup,
    getGroupConfig,
    getGroupMetadata,
    getSenderJid,
    isGroupChat,
    saveStore
} = require("../lib/groupAutomationStore")

function parseScheduleInput(value) {
    const input = String(value || "").trim()

    const relative = input.match(/^(\d+)(m|h|d)\s+([\s\S]+)$/i)
    if (relative) {
        const amount = Number(relative[1])
        const unit = relative[2].toLowerCase()
        const text = relative[3].trim()
        const unitMap = { m: 60000, h: 3600000, d: 86400000 }

        return {
            text,
            runAt: new Date(Date.now() + amount * unitMap[unit]).toISOString()
        }
    }

    const absolute = input.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s+([\s\S]+)$/)
    if (absolute) {
        const runAt = new Date(`${absolute[1]}T${absolute[2]}:00`)
        if (Number.isNaN(runAt.getTime())) {
            return null
        }

        return {
            text: absolute[3].trim(),
            runAt: runAt.toISOString()
        }
    }

    return null
}

const HELP = `⏰ *COBRA SCHEDULE*\n\n✨ Premium reminder drops for your group.\n\n*How to use:*\n• *.schedule 10m Team meeting starts soon*\n• *.schedule 2h Submit the assignment*\n• *.schedule 2026-03-21 20:00 Launch time*\n• *.schedule list*\n• *.schedule cancel 1*\n\n*Formats:* 10m, 2h, 1d or YYYY-MM-DD HH:MM`

module.exports = {
    name: "schedule",

    async execute(sock, msg, args, user, data, dbPath, analytics) {
        try {
            const chatId = msg.key.remoteJid
            const raw = String(args || "").trim()
            const lower = raw.toLowerCase()

            if (!isGroupChat(chatId)) {
                return "❌ This command works only in groups"
            }

            const metadata = await getGroupMetadata(sock, chatId)
            const senderJid = getSenderJid(msg)
            if (!canManageGroup(metadata, senderJid, user)) {
                return "🛡️ Only group admins or the owner can use this command"
            }

            const { db, group } = getGroupConfig(chatId)

            if (!raw || lower === "help") {
                return HELP
            }

            if (lower === "list") {
                return group.schedules.length
                    ? `⏰ *Scheduled Messages*\n\n${group.schedules.map((item) => `#${item.id} • ${new Date(item.runAt).toLocaleString()}\n${item.text}`).join("\n\n")}`
                    : "📭 No scheduled messages yet."
            }

            if (lower.startsWith("cancel ")) {
                const id = Number(raw.slice(7).trim())
                const index = group.schedules.findIndex((item) => item.id === id)
                if (index === -1) {
                    return "⚠️ Schedule ID not found"
                }

                group.schedules.splice(index, 1)
                group.updatedAt = new Date().toISOString()
                saveStore(db)
                return `🗑️ Scheduled message #${id} cancelled successfully.`
            }

            const parsed = parseScheduleInput(raw)
            if (!parsed || !parsed.text) {
                return HELP
            }

            const runTime = new Date(parsed.runAt)
            if (runTime.getTime() <= Date.now()) {
                return "⚠️ Please choose a future date or duration for the schedule."
            }

            const nextId = group.schedules.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1
            group.schedules.push({
                id: nextId,
                text: parsed.text,
                runAt: runTime.toISOString(),
                createdBy: senderJid,
                createdAt: new Date().toISOString()
            })
            group.updatedAt = new Date().toISOString()
            saveStore(db)

            return `⏰ Scheduled message saved successfully.\n\n• ID: ${nextId}\n• Time: ${runTime.toLocaleString()}\n• Message: ${parsed.text}`
        } catch (err) {
            console.log("SCHEDULE ERROR:", err)
            return "⚠️ Failed to schedule the message"
        }
    }
}
