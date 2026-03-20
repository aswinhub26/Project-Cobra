const {
    DEFAULT_WARN_LIMIT,
    canManageGroup,
    cleanTargetArg,
    ensureWarnEntry,
    getGroupMetadata,
    getGroupState,
    getSenderJid,
    getTargetJid,
    isGroupChat,
    participantName,
    resolveParticipantJid,
    saveGroupDb,
    sameUserJid
} = require("../lib/groupUtils")

module.exports = {
    name: "warn",

    async execute(sock, msg, args, user, data, dbPath, analytics) {
        try {
            const chatId = msg.key.remoteJid

            if (!isGroupChat(chatId)) {
                return "❌ This command works only in groups"
            }

            const metadata = await getGroupMetadata(sock, chatId)
            const senderJid = getSenderJid(msg)
            const targetJid = resolveParticipantJid(metadata, getTargetJid(msg))

            if (!canManageGroup(metadata, senderJid, user)) {
                return "🛡️ Only group admins or the owner can use this command"
            }

            if (!targetJid) {
                return "❌ Mention or reply to a member to warn"
            }

            if (sameUserJid(targetJid, senderJid)) {
                return "⚠️ You cannot warn yourself"
            }

            const { db, group } = getGroupState(chatId)
            const warnEntry = ensureWarnEntry(group, targetJid)
            const reason = cleanTargetArg(args) || "No reason provided"
            const timestamp = new Date().toISOString()

            warnEntry.count += 1
            warnEntry.reasons.unshift({
                by: senderJid,
                reason,
                at: timestamp
            })
            warnEntry.reasons = warnEntry.reasons.slice(0, 5)
            warnEntry.updatedAt = timestamp
            group.updatedAt = timestamp
            saveGroupDb(db)

            const limitNotice = warnEntry.count >= DEFAULT_WARN_LIMIT
                ? `\n🚨 Warning limit reached (${DEFAULT_WARN_LIMIT}/${DEFAULT_WARN_LIMIT}).`
                : `\n📌 Limit: ${warnEntry.count}/${DEFAULT_WARN_LIMIT}`

            return `⚠️ Warned ${participantName(metadata, targetJid)}\n📝 Reason: ${reason}\n📒 Total warnings: ${warnEntry.count}${limitNotice}`
        } catch (err) {
            console.log("WARN ERROR:", err)
            return "⚠️ Failed to warn member"
        }
    }
}
