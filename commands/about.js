const settings = require("../settings")

module.exports = {
name: "about",

execute(user, args, data, dbPath, analytics) {


return `╭━━━〔 🐍 *PROJECT COBRA* 〕━━━╮
┃ 🤖 WhatsApp Automation Engine
╰━━━━━━━━━━━━━━━━━━━━╯

👨‍💻 *Developer* : Ashx
⚙ *Version* : ${settings.version}  
🌍 *Mode* : ${settings.mode}  


🧠 *Core Features*
• Modular Plugin System
• AI Commands
• Media Downloaders
• Translation Tools
• Group Management

🚀 *Technology*
• Node.js
• Baileys WhatsApp API
• JSON Database

📜 Type *.menu* to view all commands
`
}
}