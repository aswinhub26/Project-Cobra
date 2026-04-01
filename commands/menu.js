const fs = require("fs")
const path = require("path")

module.exports = {
  name: "menu",

  execute() {
    const commandsPath = path.join(__dirname)
    const pluginsPath = path.join(__dirname, "..", "plugins")

    const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"))
    const pluginFiles = fs.existsSync(pluginsPath)
      ? fs.readdirSync(pluginsPath).filter(f => f.endsWith(".js"))
      : []

    let games = ""
    let core = ""
    let ai = ""
    let download = ""
    let tools = ""
    let other = ""

    const gameCommands = ["ttt", "quiz", "rps"]

    commandFiles.forEach(file => {
      try {
        const cmd = require(`./${file}`)
        if (!cmd.name || cmd.name === "menu") return

        if (gameCommands.includes(cmd.name)) {
          games += `│ • .${cmd.name}\n`
        } else {
          core += `│ • .${cmd.name}\n`
        }
      } catch {}
    })

    pluginFiles.forEach(file => {
      try {
        const plugin = require(`../plugins/${file}`)
        if (!plugin.name) return

        if (["ai"].includes(plugin.name)) ai += `│ • .${plugin.name}\n`
        else if (["video", "play", "ig", "gif", "viewonce", "autostatus"].includes(plugin.name)) download += `│ • .${plugin.name}\n`
        else if (["translate", "weather", "simplify", "news", "sticker"].includes(plugin.name)) tools += `│ • .${plugin.name}\n`
        else other += `│ • .${plugin.name}\n`
      } catch {}
    })

    return `╭━━━〔 🐍 *PROJECT COBRA* 〕━━━╮
┃ 🤖 WhatsApp Multi-Plugin Bot
┃ ⚡ Fast • Modular • Powerful
╰━━━━━━━━━━━━━━━━━━━━╯

╭─❍ *🎮 GAMES*
${games || "│ • None\n"}╰───────────────

╭─❍ *CORE COMMANDS*
${core || "│ • None\n"}╰───────────────

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
Example: *.ttt*`
  }
}
