const {
    canManageGroup,
    getGroupConfig,
    getGroupMetadata,
    getSenderJid,
    isGroupChat,
    saveStore
} = require("../lib/groupAutomationStore")

const HELP = `🛡️ *COBRA ANTILINK*\n\n✨ Premium protection against spam links.\n\n*How to use:*\n• *.antilink on* → block WhatsApp invite links\n• *.antilink all* → block every URL\n• *.antilink off* → disable protection\n• *.antilink status* → view current setup\n\n🐍 Only admins or the owner can change this.`

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

            const { db, group } = getGroupConfig(chatId)

            if (!action || action === "help") {
                return HELP
            }

            if (action === "status") {
                return `🛡️ *Antilink Status*\n\n• Enabled: ${group.antilink.enabled ? "Yes ✅" : "No ❌"}\n• Mode: ${group.antilink.mode === "all" ? "All links 🌐" : "WhatsApp links only 🔗"}`
            }

            if (["on", "whatsapp", "wa"].includes(action)) {
                group.antilink.enabled = true
                group.antilink.mode = "whatsapp"
            } else if (["all", "strict"].includes(action)) {
                group.antilink.enabled = true
                group.antilink.mode = "all"
            } else if (["off", "disable"].includes(action)) {
                group.antilink.enabled = false
            } else {
                return HELP
            }

            group.updatedAt = new Date().toISOString()
            saveStore(db)

            return group.antilink.enabled
                ? `🛡️ Antilink enabled in *${group.antilink.mode === "all" ? "All Links" : "WhatsApp Only"}* mode.\n✨ Cobra will now guard this group.`
                : "🛡️ Antilink protection disabled successfully."
        } catch (err) {
            console.log("ANTILINK ERROR:", err)
            return "⚠️ Failed to update antilink settings"
        }
    }
}
