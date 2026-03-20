const {
    canManageGroup,
    getGroupMetadata,
    getGroupState,
    getSenderJid,
    isGroupChat,
    saveGroupDb
} = require("../lib/groupUtils")

const HELP_TEXT = `🤖 *COBRA FILTER*\n\n✨ Auto-reply smart keywords for faster group support.\n\n*Usage:*\n• *.filter add rules | No spam. Respect everyone.*\n• *.filter add payment | UPI: cobra@upi*\n• *.filter del rules*\n• *.filter list*\n• *.filter view rules*\n\n🐍 Format for add: keyword | response`

module.exports = {
    name: "filter",

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
            const filters = group.automation.filters

            if (!rawArgs || lower === "help") {
                return HELP_TEXT
            }

            if (lower === "list") {
                const entries = Object.keys(filters)
                if (!entries.length) {
                    return "📭 No filters saved yet. Use *.filter add keyword | reply*"
                }

                return `🤖 *Saved Filters*\n\n${entries.map((key, index) => `${index + 1}. ${key}`).join("\n")}`
            }

            if (lower.startsWith("add ")) {
                const payload = rawArgs.slice(4)
                const [trigger, ...responseParts] = payload.split("|")
                const keyword = String(trigger || "").trim().toLowerCase()
                const response = responseParts.join("|").trim()

                if (!keyword || !response) {
                    return "⚠️ Use: *.filter add keyword | response*"
                }

                filters[keyword] = response
                group.updatedAt = new Date().toISOString()
                saveGroupDb(db)

                return `✅ Filter saved for *${keyword}*\n🤖 Auto-reply: ${response}`
            }

            if (lower.startsWith("del ") || lower.startsWith("delete ")) {
                const keyword = rawArgs.replace(/^delete\s+|^del\s+/i, "").trim().toLowerCase()

                if (!filters[keyword]) {
                    return "⚠️ That filter does not exist"
                }

                delete filters[keyword]
                group.updatedAt = new Date().toISOString()
                saveGroupDb(db)
                return `🗑️ Filter removed for *${keyword}*`
            }

            if (lower.startsWith("view ")) {
                const keyword = rawArgs.slice(5).trim().toLowerCase()
                if (!filters[keyword]) {
                    return "⚠️ That filter does not exist"
                }

                return `🤖 *Filter Preview*\n\n• Keyword: ${keyword}\n• Reply: ${filters[keyword]}`
            }

            return HELP_TEXT
        } catch (err) {
            console.log("FILTER ERROR:", err)
            return "⚠️ Failed to manage filters"
        }
    }
}
