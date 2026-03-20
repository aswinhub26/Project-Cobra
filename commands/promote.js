module.exports = {
    name: "promote",

    async execute(sock, msg) {
        const chatId = msg.key.remoteJid
        const target = msg.message?.extendedTextMessage?.contextInfo?.participant

        if (!target) return "⚠ Reply to user"

        await sock.groupParticipantsUpdate(chatId, [target], "promote")

        return "🛡 User promoted"
    }
}