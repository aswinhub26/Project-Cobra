const {
    canManageGroup,
    getBotJids,
    getGroupMetadata,
    resolveParticipantJid,
    getBotJid,
    getGroupMetadata,
    getSenderJid,
    getTargetJid,
    isAdmin,
    isGroupChat,
    matchesAnyJid,
    participantName,
    sameUserJid
    normalizeJid,
    participantName
} = require("../lib/groupUtils")

module.exports = {
    name: "kick",

    async execute(sock, msg, args, user) {
        try {
            const chatId = msg.key.remoteJid

            if (!isGroupChat(chatId)) {
                return "❌ This command works only in groups"
            }

            const metadata = await getGroupMetadata(sock, chatId)
            const senderJid = getSenderJid(msg)
            const botJids = getBotJids(sock, msg)
            const targetJid = resolveParticipantJid(metadata, getTargetJid(msg))
            const botJid = getBotJid(sock)
            const targetJid = normalizeJid(getTargetJid(msg))

            if (!canManageGroup(metadata, senderJid, user)) {
                return "🛡 Only group admins or the owner can use this command"
            }

            if (!isAdmin(metadata, botJids)) {
            if (!isAdmin(metadata, botJid)) {
                return "⚠ Bot must be an admin to remove members"
            }

            if (!targetJid) {
                return "❌ Mention or reply to a member to kick"
            }

            if (sameUserJid(targetJid, senderJid)) {
                return "⚠ You cannot kick yourself"
            }

            if (matchesAnyJid(targetJid, botJids)) {
                return "⚠ I cannot kick myself"
            }

            if (metadata.owner && sameUserJid(targetJid, metadata.owner)) {
            if (targetJid === senderJid) {
                return "⚠ You cannot kick yourself"
            }

            if (targetJid === botJid) {
                return "⚠ I cannot kick myself"
            }

            if (metadata.owner && targetJid === normalizeJid(metadata.owner)) {
                return "👑 I cannot remove the group owner"
            }

            if (isAdmin(metadata, targetJid)) {
                return "⚠ You cannot kick another admin with this command"
            }

            await sock.groupParticipantsUpdate(chatId, [targetJid], "remove")

            return `👢 Removed ${participantName(metadata, targetJid)} from the group`
        } catch (err) {
            console.log("KICK ERROR:", err)
            return "⚠ Failed to remove member"
        }
    }
}
