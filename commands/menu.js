const fs = require("fs")
const path = require("path")

module.exports = {

name: "menu",

execute(user, args, data, dbPath, analytics) {

const commandsPath = path.join(__dirname)
const pluginsPath = path.join(__dirname, "..", "plugins")

const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"))
const pluginFiles = fs.existsSync(pluginsPath)
? fs.readdirSync(pluginsPath).filter(f => f.endsWith(".js"))
: []

let core = ""
let ai = ""
let download = ""
let tools = ""
let other = ""

// CORE COMMANDS
commandFiles.forEach(file => {

try {

const cmd = require(`./${file}`)

if (cmd.name && cmd.name !== "menu") {
core += `│ • .${cmd.name}\n`
}

} catch {}

})

// PLUGINS
pluginFiles.forEach(file => {

try {

const plugin = require(`../plugins/${file}`)

if (!plugin.name) return

// AI category
if (["ai"].includes(plugin.name)) {
ai += `│ • .${plugin.name}\n`
}

// Download category
else if (["video","play","ig","gif","viewonce"].includes(plugin.name)) {
download += `│ • .${plugin.name}\n`
}

// Tools
else if (["translate","weather","simplify","news"].includes(plugin.name)) {
tools += `│ • .${plugin.name}\n`
}

// Other
else {
other += `│ • .${plugin.name}\n`
}

} catch {}

})


let menu = `╭━━━〔 🐍 *PROJECT COBRA* 〕━━━╮
┃ 🤖 WhatsApp Multi-Plugin Bot
┃ ⚡ Fast • Modular • Powerful
╰━━━━━━━━━━━━━━━━━━━━╯

╭─❍ *CORE COMMANDS*
${core}╰───────────────

╭─❍ *🤖 AI*
${ai || "│ • None\n"}╰───────────────

╭─❍ *📥 DOWNLOADER*
${download || "│ • None\n"}╰───────────────

╭─❍ *🌐 TOOLS*
${tools || "│ • None\n"}╰───────────────

╭─❍ *⚙ OTHER*
${other || "│ • None\n"}╰───────────────

╭─❍ *BOT INFO*
│ 👑 Owner : Ashx
│ ⚙ Version : 1.0.0
╰───────────────

✨ Type commands with *.* prefix
Example: *.ping*
`

return menu

}

}