const { clearTrackedMessages, getTrackedMessages } = require("../lib/botMessageTracker")
const settings = require("../settings")

function parseClearArgs(args) {
    const value = String(args || "").trim().toLowerCase()

    if (!value) return { mode: "count", count: 10 }
    if (["help", "-h", "--help"].includes(value)) return { mode: "help" }
    if (value === "all") return { mode: "all" }

    const parsed = Number.parseInt(value, 10)
    if (Number.isNaN(parsed) || parsed <= 0) {
        return { mode: "invalid" }
    }

    return { mode: "count", count: Math.min(parsed, 100) }
}

function getSenderJid(msg) {
    return msg.key.participant || msg.key.remoteJid
}

function isOwner(senderJid) {
    const ownerNumbers = Array.isArray(settings.owner) ? settings.owner : []
    return ownerNumbers.some((n) => senderJid === `${String(n).replace(/\D/g, "")}@s.whatsapp.net`)
}

async function isAdmin(sock, chatId, senderJid) {
    if (!chatId.endsWith("@g.us")) return true

    try {
        const metadata = await sock.groupMetadata(chatId)
        return (metadata.participants || []).some((p) => p.id === senderJid && Boolean(p.admin))
    } catch (error) {
        console.log("CLEAR ADMIN CHECK FAILED:", error.message)
        return false
    }
}

module.exports = {
    name: "clear",

    async execute(sock, msg, args, user, data, dbPath, analytics) {
        const chatId = msg.key.remoteJid
        const senderJid = getSenderJid(msg)

        try {
            const parsed = parseClearArgs(args)

            if (parsed.mode === "help") {
                return `🧹 *COBRA CLEAR*\n\nUsage:\n• *.clear*\n• *.clear 5*\n• *.clear all*\n\nThis command removes recent Cobra bot messages from the current chat.`
            }

            if (parsed.mode === "invalid") {
                return "⚠ Invalid input. Use *.clear*, *.clear 5*, *.clear all*, or *.clear help*."
            }

            const owner = isOwner(senderJid)
            const admin = await isAdmin(sock, chatId, senderJid)

            if (!owner && !admin) {
                return "🛡 Only admins/owner can use this command"
            }

            await sock.sendMessage(chatId, {
                text: "🧹 *Cobra Clear Activated*\n🧼 Cleaning recent Cobra messages..."
            }, { quoted: msg })

            const trackedBefore = getTrackedMessages(chatId)
            if (!trackedBefore.length) {
                return "⚠ No recent Cobra messages found"
            }

            const messagesToDelete = parsed.mode === "all"
                ? clearTrackedMessages(chatId, "all")
                : clearTrackedMessages(chatId, parsed.count)

            if (!messagesToDelete.length) {
                return "⚠ No recent Cobra messages found"
            }

            let deleted = 0

            for (const key of messagesToDelete) {
                try {
                    await sock.sendMessage(chatId, { delete: key })
                    deleted += 1
                } catch (error) {
                    console.log("CLEAR DELETE FAILED:", error.message)
                }
            }

            if (!deleted) {
                return "⚠ Could not delete messages. I may not have permission for older messages."
            }

            return `✅ Cleared ${deleted} message${deleted === 1 ? "" : "s"} successfully`
        } catch (error) {
            console.log("CLEAR COMMAND ERROR:", error.message)
            return "⚠ Clear failed due to an unexpected error"
        }
    }
}
