const settings = require("../settings")

module.exports = {

name: "alive",

async execute(sock, msg, args, user, data, dbPath, analytics){

try{

const chatId = msg.key.remoteJid

// reaction
await sock.sendMessage(chatId,{
react:{ text:"🐍", key: msg.key }
})

// uptime
const uptimeSeconds = Math.floor(process.uptime())

const hours = Math.floor(uptimeSeconds / 3600)
const minutes = Math.floor((uptimeSeconds % 3600) / 60)
const seconds = uptimeSeconds % 60

const uptime = `${hours}h ${minutes}m ${seconds}s`

// ping
const ping = Date.now()

const text =
`╭━━━〔 🐍 *${settings.botName}* 〕━━━╮
┃ 🤖 WhatsApp Multi-Plugin Bot
╰━━━━━━━━━━━━━━━━━━━━╯

⚡ *Version* : ${settings.version}
🟢 *Status* : Online
🌍 *Mode* : ${settings.mode}

⏱ *Uptime* : ${uptime}
📡 *Ping* : ${Date.now() - ping} ms

✨ *Features*
• 🤖 AI Commands
• 📥 Media Downloader
• 🌐 Utility Tools
• 🛡 Group Protection

📜 Type *.menu* to view all commands
`

await sock.sendMessage(chatId,{
text: text,
contextInfo:{
forwardingScore:999,
isForwarded:true
}
},{quoted:msg})

return null

}catch(err){

console.log("ALIVE ERROR:",err)

return "⚠ Bot is alive but something went wrong"

}

}

}