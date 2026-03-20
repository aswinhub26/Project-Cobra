module.exports = {
    name: "demote",

    async execute(sock, msg) {
        const chatId = msg.key.remoteJid
        const target = msg.message?.extendedTextMessage?.contextInfo?.participant

        if (!target) return "⚠ Reply to user"

        await sock.groupParticipantsUpdate(chatId, [target], "demote")

        return "⬇ User demoted"
    }
}