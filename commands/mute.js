const {
    canManageGroup,
    getBotJid,
    getGroupMetadata,
    getGroupState,
    getSenderJid,
    isAdmin,
    isGroupChat,
    saveGroupDb
} = require("../lib/groupUtils")

module.exports = {
    name: "mute",

    async execute(sock, msg, args, user) {
        try {
            const chatId = msg.key.remoteJid

            if (!isGroupChat(chatId)) {
                return "❌ This command works only in groups"
            }

            const metadata = await getGroupMetadata(sock, chatId)
            const senderJid = getSenderJid(msg)
            const botJid = getBotJid(sock)

            if (!canManageGroup(metadata, senderJid, user)) {
                return "🛡 Only group admins or the owner can use this command"
            }

            if (!isAdmin(metadata, botJid)) {
                return "⚠ Bot must be an admin to mute the group"
            }

            await sock.groupSettingUpdate(chatId, "announcement")

            const { db, group } = getGroupState(chatId)
            group.muted = true
            group.updatedAt = new Date().toISOString()
            saveGroupDb(db)

            return "🔇 Group muted. Only admins can send messages now"
        } catch (err) {
            console.log("MUTE ERROR:", err)
            return "⚠ Failed to mute group"
        }
    }
}
