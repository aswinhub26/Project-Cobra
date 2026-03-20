const {
    canManageGroup,
    getGroupConfig,
    getGroupMetadata,
    getSenderJid,
    isGroupChat,
    saveStore
} = require("../lib/groupAutomationStore")

const HELP = `🕵️ *COBRA ANTIDELETE*\n\n✨ Recover deleted chat alerts with premium style.\n\n*How to use:*\n• *.antidelete on*\n• *.antidelete off*\n• *.antidelete status*\n\n🐍 Works while the bot is online and tracking group messages.`

module.exports = {
    name: "antidelete",

    async execute(sock, msg, args, user, data, dbPath, analytics) {
        try {
            const chatId = msg.key.remoteJid
            const action = String(args || "").trim().toLowerCase()

            if (!isGroupChat(chatId)) {
                return "❌ This command works only in groups"
            }

            const metadata = await getGroupMetadata(sock, chatId)
            const senderJid = getSenderJid(msg)
            if (!canManageGroup(metadata, senderJid, user)) {
                return "🛡️ Only group admins or the owner can use this command"
            }

            const { db, group } = getGroupConfig(chatId)

            if (!action || action === "help") {
                return HELP
            }

            if (action === "status") {
                return `🕵️ *Antidelete Status*\n\n• Enabled: ${group.antidelete.enabled ? "Yes ✅" : "No ❌"}\n• Cache: Live in-memory recovery while the bot stays online.`
            }

            if (["on", "enable"].includes(action)) {
                group.antidelete.enabled = true
            } else if (["off", "disable"].includes(action)) {
                group.antidelete.enabled = false
            } else {
                return HELP
            }

            group.updatedAt = new Date().toISOString()
            saveStore(db)

            return group.antidelete.enabled
                ? "🕵️ Antidelete enabled ✅\n✨ Cobra will now watch deleted messages."
                : "🕵️ Antidelete disabled ❌\n✨ Cobra will stop monitoring deletions."
        } catch (err) {
            console.log("ANTIDELETE ERROR:", err)
            return "⚠️ Failed to update antidelete settings"
        }
    }
}
