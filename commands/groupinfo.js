const {
    getGroupMetadata,
    isGroupChat,
    listAdminJids,
    mentionTag,
    participantName
} = require("../lib/groupUtils")

module.exports = {
    name: "groupinfo",

    async execute(sock, msg, args) {
        try {
            const chatId = msg.key.remoteJid

            if (!isGroupChat(chatId)) {
                return "❌ This command works only in groups"
            }

            const metadata = await getGroupMetadata(sock, chatId)
            const admins = listAdminJids(metadata)
            const owner = metadata.owner || metadata.subjectOwner

            const text = `👥 *GROUP INFO*

📛 Name: ${metadata.subject}
👑 Owner: ${owner ? mentionTag(owner) : "Unknown"}
👥 Members: ${metadata.participants?.length || 0}
🛡 Admins: ${admins.length}
🔇 Muted: ${metadata.announce ? "Yes" : "No"}
🔒 Locked: ${metadata.restrict ? "Yes" : "No"}
📝 Description: ${metadata.desc || "No description"}`

            await sock.sendMessage(chatId, {
                text,
                mentions: owner ? [owner] : []
            }, { quoted: msg })

        } catch (e) {
            return "⚠ Failed to fetch group info"
        }
    }
}