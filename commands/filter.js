const {
    canManageGroup,
    getGroupConfig,
    getGroupMetadata,
    getSenderJid,
    isGroupChat,
    saveStore
} = require("../lib/groupAutomationStore")

const HELP = `🤖 *COBRA FILTER*\n\n✨ Smart keyword auto-replies for faster support.\n\n*How to use:*\n• *.filter add rules | No spam. Respect everyone.*\n• *.filter add payment | UPI: cobra@upi*\n• *.filter del rules*\n• *.filter list*\n• *.filter view rules*\n\n🐍 Use the format: *keyword | response*`

module.exports = {
    name: "filter",

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
            const filters = group.filters

            if (!raw || lower === "help") {
                return HELP
            }

            if (lower === "list") {
                const keys = Object.keys(filters)
                return keys.length
                    ? `🤖 *Saved Filters*\n\n${keys.map((key, index) => `${index + 1}. ${key}`).join("\n")}`
                    : "📭 No filters saved yet. Use *.filter add keyword | reply*"
            }

            if (lower.startsWith("add ")) {
                const payload = raw.slice(4)
                const [trigger, ...replyParts] = payload.split("|")
                const keyword = String(trigger || "").trim().toLowerCase()
                const reply = replyParts.join("|").trim()

                if (!keyword || !reply) {
                    return "⚠️ Use: *.filter add keyword | response*"
                }

                filters[keyword] = reply
                group.updatedAt = new Date().toISOString()
                saveStore(db)
                return `✅ Filter saved for *${keyword}*\n🤖 Auto-reply: ${reply}`
            }

            if (lower.startsWith("del ") || lower.startsWith("delete ")) {
                const keyword = raw.replace(/^delete\s+|^del\s+/i, "").trim().toLowerCase()
                if (!filters[keyword]) {
                    return "⚠️ That filter does not exist"
                }

                delete filters[keyword]
                group.updatedAt = new Date().toISOString()
                saveStore(db)
                return `🗑️ Filter removed for *${keyword}*`
            }

            if (lower.startsWith("view ")) {
                const keyword = raw.slice(5).trim().toLowerCase()
                if (!filters[keyword]) {
                    return "⚠️ That filter does not exist"
                }

                return `🤖 *Filter Preview*\n\n• Keyword: ${keyword}\n• Reply: ${filters[keyword]}`
            }

            return HELP
        } catch (err) {
            console.log("FILTER ERROR:", err)
            return "⚠️ Failed to manage filters"
        }
    }
}
