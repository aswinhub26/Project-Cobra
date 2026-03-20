const warnings = {}

module.exports = {
    name: "warnings",

    async execute(sock, msg) {
        const user = msg.key.participant || msg.key.remoteJid
        return `📊 Your warnings: ${warnings[user] || 0}`
    }
}