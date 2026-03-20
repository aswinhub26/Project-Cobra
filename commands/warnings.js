const {
    getGroupMetadata,
    getGroupState,
    getSenderJid,
    getTargetJid,
    isGroupChat,
    participantName,
    resolveParticipantJid
} = require("../lib/groupUtils")

module.exports = {
    name: "warnings",

    async execute(sock, msg, args, user, data, dbPath, analytics) {
        try {
            const chatId = msg.key.remoteJid

            if (!isGroupChat(chatId)) {
                return "❌ This command works only in groups"
            }

            const metadata = await getGroupMetadata(sock, chatId)
            const fallbackTarget = getSenderJid(msg)
            const targetJid = resolveParticipantJid(metadata, getTargetJid(msg) || fallbackTarget)
            const { group } = getGroupState(chatId)
            const record = group.warnings?.[targetJid]

            if (!record || !record.count) {
                return `✅ ${participantName(metadata, targetJid)} has no warnings`
            }

            const recentReasons = (record.reasons || [])
                .slice(0, 3)
                .map((entry, index) => `${index + 1}. ${entry.reason}`)
                .join("\n") || "None"

            return `📒 Warning record for ${participantName(metadata, targetJid)}\n⚠️ Total warnings: ${record.count}\n📝 Recent reasons:\n${recentReasons}`
        } catch (err) {
            console.log("WARNINGS ERROR:", err)
            return "⚠️ Failed to fetch warnings"
        }
    }
}
