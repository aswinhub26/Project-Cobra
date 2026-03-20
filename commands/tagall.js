const {
    canManageGroup,
    getGroupMetadata,
    getSenderJid,
    isGroupChat,
    mentionTag,
    normalizeJid,
    participantName
} = require("../lib/groupUtils")

module.exports = {
    name: "tagall",

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

            const header = String(args || "").trim() || "📢 Attention everyone"
            const body = mentions
                .map((jid, index) => `${index + 1}. ${mentionTag(jid)} — ${participantName(metadata, jid)}`)
                .join("\n")

            await sock.sendMessage(chatId, {
                text: `${header}\n\n${body}`,
                mentions
            }, { quoted: msg })

            return null
        } catch (err) {
            console.log("TAGALL ERROR:", err)
            return "⚠️ Failed to tag all members"
        }
    }
}
