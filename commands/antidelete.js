const {
    canManageGroup,
    getGroupMetadata,
    getGroupState,
    getSenderJid,
    isGroupChat,
    saveGroupDb
} = require("../lib/groupUtils")

const HELP_TEXT = `🕵️ *COBRA ANTIDELETE*\n\n✨ Recover deleted chat evidence with premium alert style.\n\n*Usage:*\n• *.antidelete on*\n• *.antidelete off*\n• *.antidelete status*\n\n🐍 When enabled, Cobra will repost deleted text/media alerts in the group.`

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

            const { db, group } = getGroupState(chatId)
            const config = group.automation.antidelete

            if (!action || action === "help") {
                return HELP_TEXT
            }

            if (action === "status") {
                return `🕵️ *Antidelete Status*\n\n• Enabled: ${config.enabled ? "Yes ✅" : "No ❌"}\n• Cache: Live memory tracking active while bot is online.`
            }

            if (["on", "enable"].includes(action)) {
                config.enabled = true
            } else if (["off", "disable"].includes(action)) {
                config.enabled = false
            } else {
                return HELP_TEXT
            }

            group.updatedAt = new Date().toISOString()
            saveGroupDb(db)

            return `🕵️ Antidelete ${config.enabled ? "enabled ✅" : "disabled ❌"}.\n✨ Cobra will ${config.enabled ? "watch deleted messages" : "stop monitoring deletions"}.`
        } catch (err) {
            console.log("ANTIDELETE ERROR:", err)
            return "⚠️ Failed to update antidelete settings"
        }
    }
}
