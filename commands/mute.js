module.exports = {
    name: "mute",

    async execute(sock, msg) {
        await sock.groupSettingUpdate(msg.key.remoteJid, "announcement")
        return "🔇 Group muted"
    }
}