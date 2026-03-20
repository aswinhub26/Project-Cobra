const {
    canManageGroup,
    getGroupMetadata,
    getSenderJid,
    isGroupChat,
    normalizeJid
} = require("../lib/groupUtils")

module.exports = {
    name: "hidetag",

    async execute(sock, msg, args, user, data, dbPath, analytics) {
        try {
            const chatId = msg.key.remoteJid

            if (!isGroupChat(chatId)) {
                return "❌ This command works only in groups"
            }

            const metadata = await getGroupMetadata(sock, chatId)
            const senderJid = getSenderJid(msg)

            if (!canManageGroup(metadata, senderJid, user)) {
                return "🛡️ Only group admins or the owner can use this command"
            }

            const mentions = metadata.participants
                .map((participant) => normalizeJid(participant.id || participant.jid || participant.lid))
                .filter(Boolean)

            const text = String(args || "").trim() || "📢 Hidden announcement from Cobra"

            await sock.sendMessage(chatId, {
                text,
                mentions
            }, { quoted: msg })

            return null
        } catch (err) {
            console.log("HIDETAG ERROR:", err)
            return "⚠️ Failed to send hidden tag message"
        }
    }
}
