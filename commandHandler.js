const fs = require("fs")
const path = require("path")
const chokidar = require("chokidar")

console.log("\n🐍 Project Cobra Booting...\n")

// cooldown storage
const cooldowns = {}

// analytics storage
const analytics = {
    totalCommands: 0,
    commandUsage: {},
    userUsage: {},
    startTime: Date.now()
}

const commands = {}

const commandsPath = path.join(__dirname, "commands")
const pluginsPath = path.join(__dirname, "plugins")

function ensureRuntimeDirs() {
    const logsDir = path.join(__dirname, "logs")
    const dbDir = path.join(__dirname, "database")

    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true })
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })
}

function loadModule(filePath, label) {
    try {
        delete require.cache[require.resolve(filePath)]

        const mod = require(filePath)

        if (!mod || !mod.name || typeof mod.execute !== "function") {
            console.log(`⚠ Skipping ${label} → invalid module export`)
            return null
        }

        commands[mod.name] = mod
        console.log(`✔ ${label} loaded → ${mod.name}`)
        return mod
    } catch (err) {
        console.log(`⚠ Failed to load ${label} → ${path.basename(filePath)} (${err.message})`)
        return null
    }
}

ensureRuntimeDirs()

// only load .js files
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"))
const pluginFiles = fs.existsSync(pluginsPath)
    ? fs.readdirSync(pluginsPath).filter(f => f.endsWith(".js"))
    : []

console.log("⚡ Loading Commands...\n")

for (const file of commandFiles) {
    loadModule(path.join(commandsPath, file), "Command")
}

console.log("\n🔌 Loading Plugins...\n")

for (const file of pluginFiles) {
    loadModule(path.join(pluginsPath, file), "Plugin")
}

console.log("\n🚀 Cobra Ready for Commands 🐍\n")

async function handleCommand(sock, msg, commandName, userName, args) {

    const dbPath = path.join(__dirname, "database", "users.json")
    const logPath = path.join(__dirname, "logs", "commands.log")

    const data = JSON.parse(fs.readFileSync(dbPath))

    let user = data.users.find(u => u.name === userName)

    // AUTO CREATE USER
    if (!user) {

        console.log(`👤 New user detected → ${userName}`)

        user = {
            name: userName,
            banned: false
        }

        data.users.push(user)

        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2))
    }

    if (user.banned) return "🚫 You are banned"

    // cooldown system
    const cooldownTime = 3000
    const now = Date.now()

    if (cooldowns[userName] && now - cooldowns[userName] < cooldownTime) {

        const remaining =
            ((cooldownTime - (now - cooldowns[userName])) / 1000).toFixed(1)

        return `⏳ Please wait ${remaining}s before using another command`
    }

    cooldowns[userName] = now

    const command = commands[commandName]

    if (!command) return "❌ Command not found"

    try {

        analytics.totalCommands++

        analytics.commandUsage[commandName] =
            (analytics.commandUsage[commandName] || 0) + 1

        analytics.userUsage[userName] =
            (analytics.userUsage[userName] || 0) + 1

        const log =
            `[${new Date().toLocaleString()}] ${userName} used .${commandName}\n`

        fs.appendFileSync(logPath, log)

        return await command.execute(sock, msg, args, user, data, dbPath, analytics)

    } catch (err) {

        console.error("❌ Command Error:", err)

        return "⚠ Error executing command"
    }
}

module.exports = handleCommand


// 🔄 HOT RELOAD PLUGINS
const pluginsFolder = path.join(__dirname, "plugins")

chokidar.watch(pluginsFolder).on("change", (file) => {

    if (!file.endsWith(".js")) return

    console.log(`\n🔄 Reloading plugin → ${path.basename(file)}`)

    const plugin = loadModule(file, "Plugin")

    if (plugin) {
        console.log(`✅ Plugin ${plugin.name} reloaded successfully\n`)
    }
})
