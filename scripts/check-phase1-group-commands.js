const path = require("path")

const commandFiles = [
    "commands/demote.js",
    "commands/groupinfo.js",
    "commands/hidetag.js",
    "commands/kick.js",
    "commands/mute.js",
    "commands/promote.js",
    "commands/tagall.js",
    "commands/unmute.js",
    "commands/warn.js",
    "commands/warnings.js"
]

let hasFailure = false

for (const file of commandFiles) {
    const absolutePath = path.join(__dirname, "..", file)

    try {
        delete require.cache[require.resolve(absolutePath)]

        const command = require(absolutePath)

        if (!command || typeof command !== "object") {
            throw new Error("module did not export an object")
        }

        if (!command.name || typeof command.name !== "string") {
            throw new Error("missing command name")
        }

        if (typeof command.execute !== "function") {
            throw new Error("missing execute function")
        }

        console.log(`✔ ${file} → ${command.name}`)
    } catch (error) {
        hasFailure = true
        console.error(`✖ ${file} → ${error.message}`)
    }
}

if (hasFailure) {
    process.exit(1)
}

console.log("✅ Phase-one group commands loaded successfully")
