const fs = require("fs")
const path = require("path")

module.exports = {

name: "menu",

execute() {

const commandsPath = path.join(__dirname)
const pluginsPath = path.join(__dirname, "..", "plugins")

const commandFiles = fs.readdirSync(commandsPath)
const pluginFiles = fs.existsSync(pluginsPath)
? fs.readdirSync(pluginsPath)
: []

let coreCommands = ""
let pluginCommands = ""

commandFiles.forEach(file => {

const cmd = require(`./${file}`)

if (cmd.name !== "menu") {
coreCommands += `│ • .${cmd.name}\n`
}

})

pluginFiles.forEach(file => {

const plugin = require(`../plugins/${file}`)

pluginCommands += `│ • .${plugin.name}\n`

})

let menu = `╭━━━〔 🐍 *PROJECT COBRA* 〕━━━╮
┃ 🤖 *WhatsApp Multi-Plugin Bot*
┃ ⚡ Fast • Modular • Powerful
╰━━━━━━━━━━━━━━━━━━━━╯

╭─❍ *CORE COMMANDS*
${coreCommands}╰───────────────

╭─❍ *PLUGINS*
${pluginCommands}╰───────────────

╭─❍ *INFO*
│ 👑 Owner: Ashx
│ ⚙ Version: 1.0.0
│ 🌐 Mode: Public
╰───────────────

✨ *Type a command with .* prefix
Example: *.ping*
`

return menu

}

}