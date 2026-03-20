const {
    canManageGroup,
    getBotJids,
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
    getBotJid,
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
    getGroupMetadata,
    getGroupState,
    getSenderJid,
    isAdmin,
    isGroupChat,
    saveGroupDb
} = require("../lib/groupUtils")

module.exports = {
    name: "unmute",

    async execute(sock, msg, args, user) {
        try {
            const chatId = msg.key.remoteJid

            if (!isGroupChat(chatId)) {
                return "❌ This command works only in groups"
            }

            const metadata = await getGroupMetadata(sock, chatId)
            const senderJid = getSenderJid(msg)
            const botJids = getBotJids(sock, msg)
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
            const botJid = getBotJid(sock)
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs

            if (!canManageGroup(metadata, senderJid, user)) {
                return "🛡 Only group admins or the owner can use this command"
            }

            if (!isAdmin(metadata, botJids)) {
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
            if (!isAdmin(metadata, botJid)) {
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
                return "⚠ Bot must be an admin to unmute the group"
            }

            await sock.groupSettingUpdate(chatId, "not_announcement")

            const { db, group } = getGroupState(chatId)
            group.muted = false
            group.updatedAt = new Date().toISOString()
            saveGroupDb(db)

            return "🔊 Group unmuted. Members can send messages again"
        } catch (err) {
            console.log("UNMUTE ERROR:", err)
            return "⚠ Failed to unmute group"
        }
    }
}
