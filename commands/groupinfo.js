const {
    getGroupMetadata,
    isGroupChat,
    listAdminJids,
    participantName
} = require("../lib/groupUtils")

module.exports = {
    name: "groupinfo",

    async execute(sock, msg) {
        try {
            const chatId = msg.key.remoteJid

            if (!isGroupChat(chatId)) {
                return "❌ This command works only in groups"
            }

            const metadata = await getGroupMetadata(sock, chatId)
            const adminJids = listAdminJids(metadata)
            const ownerName = metadata.owner
                ? participantName(metadata, metadata.owner)
                : "Unknown"

            const text = `👥 *Group Info*

📛 Name: ${metadata.subject || "Unnamed Group"}
🆔 ID: ${chatId}
👑 Owner: ${ownerName}
👤 Members: ${metadata.participants?.length || 0}
🛡 Admins: ${adminJids.length}
🔇 Muted: ${metadata.announce ? "Yes" : "No"}
🔒 Locked Edit Info: ${metadata.restrict ? "Yes" : "No"}
📝 Description: ${metadata.desc || "No description set"}`

            return text
        } catch (err) {
            console.log("GROUPINFO ERROR:", err)
            return "⚠ Failed to fetch group info"
        }
    }
}
