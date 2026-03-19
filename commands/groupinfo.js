const {
    getGroupMetadata,
    isGroupChat,
    listAdminJids,
    mentionTag,
    participantName
} = require("../lib/groupUtils")

function compactText(value) {
    return String(value || "")
        .replace(/\s+/g, " ")
        .trim()
}

module.exports = {
    name: "groupinfo",

    async execute(sock, msg, args) {
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
            const ownerJid = metadata.owner || metadata.subjectOwner || ""
            const memberCount = metadata.participants?.length || 0
            const adminCount = adminJids.length
            const regularCount = Math.max(memberCount - adminCount, 0)
            const ownerLine = ownerJid
                ? `${mentionTag(ownerJid)} (${participantName(metadata, ownerJid)})`
                : "Unavailable"
            const description = compactText(metadata.desc) || "No description set"
            const wantsFullId = /\b(full|id)\b/i.test(String(args || ""))

            let text = `👥 *Group Info*

📛 Name: ${metadata.subject || "Unnamed Group"}
👑 Owner: ${ownerLine}
👥 Total Members: ${memberCount}
🛡 Admins: ${adminCount}
🙋 Regular Members: ${regularCount}
🔇 Muted: ${metadata.announce ? "Yes" : "No"}
🔒 Locked Edit Info: ${metadata.restrict ? "Yes" : "No"}
📝 Description: ${description}`

            if (wantsFullId) {
                text += `\n🆔 Group JID: \`${chatId}\``
            }

            await sock.sendMessage(chatId, {
                text,
                mentions: ownerJid ? [ownerJid] : []
            }, { quoted: msg })

            return null
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
