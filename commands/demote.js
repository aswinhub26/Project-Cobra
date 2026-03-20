const {
    canManageGroup,
    getBotJids,
    getGroupMetadata,
    resolveParticipantJid,
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
    getBotJid,
    getGroupMetadata,
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
    getSenderJid,
    getTargetJid,
    isAdmin,
    isGroupChat,
    participantName,
    sameUserJid
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
    normalizeJid,
    participantName
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
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
            const botJid = getBotJid(sock)
            const targetJid = normalizeJid(getTargetJid(msg))
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
                return "⚠ Bot must be an admin to demote members"
            }

            if (!targetJid) {
                return "❌ Mention or reply to an admin to demote"
            }

            if (metadata.owner && sameUserJid(targetJid, metadata.owner)) {
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
            if (metadata.owner && targetJid === normalizeJid(metadata.owner)) {
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
