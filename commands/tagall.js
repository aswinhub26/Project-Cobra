const { getGroupMetadata, mentionTag } = require("../lib/groupUtils")

module.exports = {
    name: "tagall",

    async execute(sock, msg) {
        const chatId = msg.key.remoteJid
        const metadata = await getGroupMetadata(sock, chatId)

        const mentions = metadata.participants.map(p => p.id)

        const text = mentions.map(m => mentionTag(m)).join("\n")

        await sock.sendMessage(chatId, { text, mentions })
    }
}