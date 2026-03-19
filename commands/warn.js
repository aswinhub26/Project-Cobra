const {
    canManageGroup,
    cleanTargetArg,
    ensureWarnEntry,
    getGroupMetadata,
    getGroupState,
    resolveParticipantJid,
    getSenderJid,
    getTargetJid,
    isGroupChat,
    participantName,
    saveGroupDb,
    sameUserJid
    getSenderJid,
    getTargetJid,
    isGroupChat,
    normalizeJid,
    participantName,
    saveGroupDb
} = require("../lib/groupUtils")

module.exports = {
    name: "warn",

    async execute(sock, msg, args, user) {
        try {
            const chatId = msg.key.remoteJid

            if (!isGroupChat(chatId)) {
                return "❌ This command works only in groups"
            }

            const metadata = await getGroupMetadata(sock, chatId)
            const senderJid = getSenderJid(msg)
            const targetJid = resolveParticipantJid(metadata, getTargetJid(msg))
            const targetJid = normalizeJid(getTargetJid(msg))

            if (!canManageGroup(metadata, senderJid, user)) {
                return "🛡 Only group admins or the owner can use this command"
            }

            if (!targetJid) {
                return "❌ Mention or reply to a member to warn"
            }

            if (sameUserJid(targetJid, senderJid)) {
            if (targetJid === senderJid) {
                return "⚠ You cannot warn yourself"
            }

            const { db, group } = getGroupState(chatId)
            const warnEntry = ensureWarnEntry(group, targetJid)
            const reason = cleanTargetArg(args) || "No reason provided"

            warnEntry.count += 1
            warnEntry.reasons.unshift({
                by: senderJid,
                reason,
                at: new Date().toISOString()
            })
            warnEntry.reasons = warnEntry.reasons.slice(0, 5)
            warnEntry.updatedAt = new Date().toISOString()
            group.updatedAt = new Date().toISOString()

            saveGroupDb(db)

            return `⚠ Warned ${participantName(metadata, targetJid)}\nTotal warnings: ${warnEntry.count}\nReason: ${reason}`
        } catch (err) {
            console.log("WARN ERROR:", err)
            return "⚠ Failed to warn member"
        }
    }
}
