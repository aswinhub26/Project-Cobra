const {
    canManageGroup,
    getBotJid,
    getGroupMetadata,
    getSenderJid,
    getTargetJid,
    isAdmin,
    isGroupChat,
    normalizeJid,
    participantName
} = require("../lib/groupUtils")

module.exports = {
    name: "promote",

    async execute(sock, msg, args, user) {
        try {
            const chatId = msg.key.remoteJid

            if (!isGroupChat(chatId)) {
                return "❌ This command works only in groups"
            }

            const metadata = await getGroupMetadata(sock, chatId)
            const senderJid = getSenderJid(msg)
            const botJid = getBotJid(sock)
            const targetJid = normalizeJid(getTargetJid(msg))

            if (!canManageGroup(metadata, senderJid, user)) {
                return "🛡 Only group admins or the owner can use this command"
            }

            if (!isAdmin(metadata, botJid)) {
                return "⚠ Bot must be an admin to promote members"
            }

            if (!targetJid) {
                return "❌ Mention or reply to a member to promote"
            }

            if (isAdmin(metadata, targetJid)) {
                return "ℹ This member is already an admin"
            }

            await sock.groupParticipantsUpdate(chatId, [targetJid], "promote")

            return `🛡 Promoted ${participantName(metadata, targetJid)} to admin`
        } catch (err) {
            console.log("PROMOTE ERROR:", err)
            return "⚠ Failed to promote member"
        }
    }
}
