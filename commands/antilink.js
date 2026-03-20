const {
    canManageGroup,
    getGroupMetadata,
    getGroupState,
    getSenderJid,
    isGroupChat,
    saveGroupDb
} = require("../lib/groupUtils")

const HELP_TEXT = `🛡️ *COBRA ANTILINK*\n\n✨ Premium anti-link protection for your group.\n\n*Usage:*\n• *.antilink on* → block WhatsApp invite links\n• *.antilink all* → block all links\n• *.antilink off* → disable protection\n• *.antilink status* → view current mode\n\n🐍 Tip: admins and owner stay exempt.`

module.exports = {
    name: "antilink",

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
            const config = group.automation.antilink

            if (!action || action === "help") {
                return HELP_TEXT
            }

            if (action === "status") {
                return `🛡️ *Antilink Status*\n\n• Enabled: ${config.enabled ? "Yes ✅" : "No ❌"}\n• Mode: ${config.mode === "all" ? "All links 🌐" : "WhatsApp links only 🔗"}`
            }

            if (["on", "whatsapp", "wa"].includes(action)) {
                config.enabled = true
                config.mode = "whatsapp"
            } else if (["all", "strict"].includes(action)) {
                config.enabled = true
                config.mode = "all"
            } else if (["off", "disable"].includes(action)) {
                config.enabled = false
            } else {
                return HELP_TEXT
            }

            group.updatedAt = new Date().toISOString()
            saveGroupDb(db)

            if (!config.enabled) {
                return "🛡️ Antilink protection disabled successfully."
            }

            return `🛡️ Antilink enabled in *${config.mode === "all" ? "All Links" : "WhatsApp Only"}* mode.\n✨ Cobra will now guard this group automatically.`
        } catch (err) {
            console.log("ANTILINK ERROR:", err)
            return "⚠️ Failed to update antilink settings"
        }
    }
}
