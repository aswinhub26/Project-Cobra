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

    let menu = "🐍 Cobra Menu\n\n"

    commandFiles.forEach(file => {
        const cmd = require(`./${file}`)
        menu += `• ${cmd.name}\n`
    })

    pluginFiles.forEach(file => {
        const plugin = require(`../plugins/${file}`)
        menu += `• ${plugin.name}\n`
    })

    return menu
}

}