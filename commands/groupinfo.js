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

    async execute(sock, msg, args, user, data, dbPath, analytics) {
        try {
            const chatId = msg.key.remoteJid

            if (!isGroupChat(chatId)) {
                return "❌ This command works only in groups"
            }

            const metadata = await getGroupMetadata(sock, chatId)
            const adminJids = listAdminJids(metadata)
            const ownerJid = metadata.owner || metadata.subjectOwner || ""
            const memberCount = metadata.participants.length
            const adminCount = adminJids.length
            const regularCount = Math.max(memberCount - adminCount, 0)
            const description = compactText(metadata.desc) || "No description set"
            const wantsFullId = /\b(full|id)\b/i.test(String(args || ""))
            const ownerLabel = ownerJid
                ? `${mentionTag(ownerJid)} (${participantName(metadata, ownerJid)})`
                : "Unavailable"

            let text = `👥 *Group Info*\n\n` +
                `📛 Name: ${metadata.subject || "Unnamed Group"}\n` +
                `👑 Owner: ${ownerLabel}\n` +
                `👥 Total Members: ${memberCount}\n` +
                `🛡️ Admins: ${adminCount}\n` +
                `🙋 Regular Members: ${regularCount}\n` +
                `🔇 Muted: ${metadata.announce ? "Yes" : "No"}\n` +
                `🔒 Locked Info: ${metadata.restrict ? "Yes" : "No"}\n` +
                `📝 Description: ${description}`

            if (wantsFullId) {
                text += `\n🆔 Group JID: \`${chatId}\``
            }

            await sock.sendMessage(chatId, {
                text,
                mentions: ownerJid ? [ownerJid] : []
            }, { quoted: msg })

            return null
        } catch (err) {
            console.log("GROUPINFO ERROR:", err)
            return "⚠️ Failed to fetch group info"
        }
    }
}
