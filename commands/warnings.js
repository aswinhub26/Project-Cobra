const {
    getGroupMetadata,
    getGroupState,
    getTargetJid,
    isGroupChat,
    normalizeJid,
    participantName
} = require("../lib/groupUtils")

module.exports = {
    name: "warnings",

    async execute(sock, msg) {
        try {
            const chatId = msg.key.remoteJid

            if (!isGroupChat(chatId)) {
                return "❌ This command works only in groups"
            }

            const metadata = await getGroupMetadata(sock, chatId)
            const targetJid = normalizeJid(getTargetJid(msg))
            const { group } = getGroupState(chatId)

            if (targetJid) {
                const record = group.warnings[targetJid]

                if (!record) {
                    return `✅ ${participantName(metadata, targetJid)} has no warnings`
                }

                const recentReasons = record.reasons
                    .slice(0, 3)
                    .map((entry, index) => `${index + 1}. ${entry.reason}`)
                    .join("\n")

                return `📒 Warning record for ${participantName(metadata, targetJid)}\nTotal warnings: ${record.count}\nRecent reasons:\n${recentReasons || "None"}`
            }

            const warningEntries = Object.entries(group.warnings || {})
                .filter(([, value]) => value?.count > 0)
                .sort((a, b) => b[1].count - a[1].count)

            if (!warningEntries.length) {
                return "✅ No warnings recorded in this group"
            }

            const summary = warningEntries
                .slice(0, 10)
                .map(([jid, value], index) => `${index + 1}. ${participantName(metadata, jid)} — ${value.count}`)
                .join("\n")

            return `📒 *Group warnings summary*\n${summary}`
        } catch (err) {
            console.log("WARNINGS ERROR:", err)
            return "⚠ Failed to fetch warnings"
        }
    }
}
