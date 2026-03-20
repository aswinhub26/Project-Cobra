const {
    DEFAULT_GOODBYE_MESSAGE,
    DEFAULT_WELCOME_MESSAGE,
    canManageGroup,
    getGroupMetadata,
    getGroupState,
    getSenderJid,
    isGroupChat,
    saveGroupDb
} = require("../lib/groupUtils")

const HELP_TEXT = `🎉 *COBRA WELCOME*\n\n✨ Stylish join/leave greetings with premium vibes.\n\n*Usage:*\n• *.welcome on*\n• *.welcome off*\n• *.welcome status*\n• *.welcome message Welcome {user} to *{group}*!*\n• *.welcome goodbye Bye {user}*\n• *.welcome reset*\n\n*Placeholders:*\n• {user}\n• {group}\n• {count}`

module.exports = {
    name: "welcome",

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
            const config = group.automation.welcome

            if (!rawArgs || lower === "help") {
                return HELP_TEXT
            }

            if (lower === "status") {
                return `🎉 *Welcome Status*\n\n• Enabled: ${config.enabled ? "Yes ✅" : "No ❌"}\n• Welcome Text: ${config.welcomeMessage}\n• Goodbye Text: ${config.goodbyeMessage}`
            }

            if (lower === "on") {
                config.enabled = true
            } else if (lower === "off") {
                config.enabled = false
            } else if (lower === "reset") {
                config.welcomeMessage = DEFAULT_WELCOME_MESSAGE
                config.goodbyeMessage = DEFAULT_GOODBYE_MESSAGE
            } else if (lower.startsWith("message ")) {
                config.welcomeMessage = rawArgs.slice(8).trim() || DEFAULT_WELCOME_MESSAGE
            } else if (lower.startsWith("goodbye ")) {
                config.goodbyeMessage = rawArgs.slice(8).trim() || DEFAULT_GOODBYE_MESSAGE
            } else {
                return HELP_TEXT
            }

            group.updatedAt = new Date().toISOString()
            saveGroupDb(db)

            return `🎉 Welcome system updated successfully.\n\n• Enabled: ${config.enabled ? "Yes ✅" : "No ❌"}\n• Welcome Template Ready\n• Goodbye Template Ready\n\n🐍 Use *.welcome status* to preview the current setup.`
        } catch (err) {
            console.log("WELCOME ERROR:", err)
            return "⚠️ Failed to update welcome settings"
        }
    }
}
