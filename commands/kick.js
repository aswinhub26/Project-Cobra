const {
    canManageGroup,
    getBotJids,
    getGroupMetadata,
    getSenderJid,
    getTargetJid,
    isAdmin,
    isGroupChat,
    matchesAnyJid,
    participantName,
    resolveParticipantJid,
    sameUserJid
} = require("../lib/groupUtils")

module.exports = {
    name: "kick",

    async execute(sock, msg, args, user, data, dbPath, analytics) {
        try {
            const chatId = msg.key.remoteJid

            if (!isGroupChat(chatId)) {
                return "❌ This command works only in groups"
            }

            const metadata = await getGroupMetadata(sock, chatId)
            const senderJid = getSenderJid(msg)
            const botJids = getBotJids(sock, msg)
            const targetJid = resolveParticipantJid(metadata, getTargetJid(msg))

            if (!canManageGroup(metadata, senderJid, user)) {
                return "🛡️ Only group admins or the owner can use this command"
            }

            if (!isAdmin(metadata, botJids)) {
                return "⚠️ Bot must be an admin to remove members"
            }

            if (!targetJid) {
                return "❌ Mention or reply to a member to kick"
            }

            if (sameUserJid(targetJid, senderJid)) {
                return "⚠️ You cannot kick yourself"
            }

            if (matchesAnyJid(targetJid, botJids)) {
                return "⚠️ I cannot kick myself"
            }

            if (metadata.owner && sameUserJid(targetJid, metadata.owner)) {
                return "👑 I cannot remove the group owner"
            }

            if (isAdmin(metadata, targetJid)) {
                return "⚠️ You cannot kick another admin with this command"
            }

            await sock.groupParticipantsUpdate(chatId, [targetJid], "remove")
            return `✅ Removed ${participantName(metadata, targetJid)} from the group`
        } catch (err) {
            console.log("KICK ERROR:", err)
            return "⚠️ Failed to remove member"
        }
    }
}
