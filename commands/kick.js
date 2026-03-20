const { getGroupMetadata, isGroupChat, listAdminJids } = require("../lib/groupUtils")

module.exports = {
    name: "kick",

    async execute(sock, msg) {
        try {
            const chatId = msg.key.remoteJid
            const sender = msg.key.participant || msg.key.remoteJid

            if (!isGroupChat(chatId)) return "❌ Group only command"

            const metadata = await getGroupMetadata(sock, chatId)
            const admins = listAdminJids(metadata)

            if (!admins.includes(sender)) return "⚠ Only admins can use this"

            const target = msg.message?.extendedTextMessage?.contextInfo?.participant
            if (!target) return "⚠ Reply to a user"

            await sock.groupParticipantsUpdate(chatId, [target], "remove")

            return "✅ User kicked 🥾"
        } catch {
            return "⚠ Failed to kick user"
        }
    }
}