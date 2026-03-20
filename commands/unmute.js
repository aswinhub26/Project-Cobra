module.exports = {
    name: "unmute",

    async execute(sock, msg) {
        await sock.groupSettingUpdate(msg.key.remoteJid, "not_announcement")
        return "🔊 Group unmuted"
    }
}