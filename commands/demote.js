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
    participantName,
    sameUserJid
    normalizeJid,
    participantName
} = require("../lib/groupUtils")

module.exports = {
    name: "demote",

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
                return "⚠ Bot must be an admin to demote members"
            }

            if (!targetJid) {
                return "❌ Mention or reply to an admin to demote"
            }

            if (metadata.owner && sameUserJid(targetJid, metadata.owner)) {
            if (metadata.owner && targetJid === normalizeJid(metadata.owner)) {
                return "👑 I cannot demote the group owner"
            }

            if (!isAdmin(metadata, targetJid)) {
                return "ℹ This member is not an admin"
            }

            await sock.groupParticipantsUpdate(chatId, [targetJid], "demote")

            return `⬇ Demoted ${participantName(metadata, targetJid)} from admin`
        } catch (err) {
            console.log("DEMOTE ERROR:", err)
            return "⚠ Failed to demote member"
        }
    }
}
