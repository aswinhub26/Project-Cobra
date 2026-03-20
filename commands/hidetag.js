const {
    canManageGroup,
    getGroupMetadata,
    getSenderJid,
    isGroupChat,
    mentionTag,
    normalizeJid
} = require("../lib/groupUtils")

module.exports = {
    name: "hidetag",

    async execute(sock, msg, args, user) {
        try {
            const chatId = msg.key.remoteJid

            if (!isGroupChat(chatId)) {
                return "❌ This command works only in groups"
            }

            const metadata = await getGroupMetadata(sock, chatId)
            const senderJid = getSenderJid(msg)

            if (!canManageGroup(metadata, senderJid, user)) {
                return "🛡 Only group admins or the owner can use this command"
            }

            const members = (metadata.participants || []).map((participant) => normalizeJid(participant.id))
            const text = args?.trim() || `📢 Hidden admin announcement\n${members.map(mentionTag).join(" ")}`

            await sock.sendMessage(chatId, {
                text,
                mentions: members
            }, { quoted: msg })

            return null
        } catch (err) {
            console.log("HIDETAG ERROR:", err)
            return "⚠ Failed to send hidden tag"
        }
    }
}
