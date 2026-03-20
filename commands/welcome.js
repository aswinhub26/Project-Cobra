const {
    DEFAULT_GOODBYE_MESSAGE,
    DEFAULT_WELCOME_MESSAGE,
    canManageGroup,
    getGroupConfig,
    getGroupMetadata,
    getSenderJid,
    isGroupChat,
    saveStore
} = require("../lib/groupAutomationStore")

const HELP = `🎉 *COBRA WELCOME*\n\n✨ Stylish premium welcome and goodbye messages.\n\n*How to use:*\n• *.welcome on*\n• *.welcome off*\n• *.welcome status*\n• *.welcome message Welcome {user} to *{group}*!*\n• *.welcome goodbye Bye {user}*\n• *.welcome reset*\n\n*Placeholders:* {user}, {group}, {count}`

module.exports = {
    name: "welcome",

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

            if (lower === "status") {
                return `🎉 *Welcome Status*\n\n• Enabled: ${group.welcome.enabled ? "Yes ✅" : "No ❌"}\n• Welcome Text: ${group.welcome.welcomeMessage}\n• Goodbye Text: ${group.welcome.goodbyeMessage}`
            }

            if (lower === "on") {
                group.welcome.enabled = true
            } else if (lower === "off") {
                group.welcome.enabled = false
            } else if (lower === "reset") {
                group.welcome.welcomeMessage = DEFAULT_WELCOME_MESSAGE
                group.welcome.goodbyeMessage = DEFAULT_GOODBYE_MESSAGE
            } else if (lower.startsWith("message ")) {
                group.welcome.welcomeMessage = raw.slice(8).trim() || DEFAULT_WELCOME_MESSAGE
            } else if (lower.startsWith("goodbye ")) {
                group.welcome.goodbyeMessage = raw.slice(8).trim() || DEFAULT_GOODBYE_MESSAGE
            } else {
                return HELP
            }

            group.updatedAt = new Date().toISOString()
            saveStore(db)

            return `🎉 Welcome system updated successfully.\n\n• Enabled: ${group.welcome.enabled ? "Yes ✅" : "No ❌"}\n🐍 Use *.welcome status* to preview the templates.`
        } catch (err) {
            console.log("WELCOME ERROR:", err)
            return "⚠️ Failed to update welcome settings"
        }
    }
}
