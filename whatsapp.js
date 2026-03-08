require("dotenv").config()

const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason
} = require("@whiskeysockets/baileys")

const qrcode = require("qrcode-terminal")
const pino = require("pino")
const handleCommand = require("./commandHandler")

async function startBot() {

    const { state, saveCreds } = await useMultiFileAuthState("auth")
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: "silent" }),
        browser: ["Project Cobra", "Chrome", "1.0"]
    })

    sock.ev.on("connection.update", (update) => {

        const { connection, lastDisconnect, qr } = update

        if (qr) {
            console.log("\n📱 Scan this QR with WhatsApp\n")
            qrcode.generate(qr, { small: true })
        }

        if (connection === "open") {
            console.log("🐍 Project Cobra connected to WhatsApp!")
        }

        if (connection === "close") {

            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

            console.log("⚠ Connection closed. Reconnecting:", shouldReconnect)

            if (shouldReconnect) {
                startBot()
            }
        }

    })

    sock.ev.on("creds.update", saveCreds)

    sock.ev.on("messages.upsert", async ({ messages }) => {

        const msg = messages[0]

        if (!msg.message) return

        const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text

        if (!text) return

        console.log("Message received:", text)

        // ignore non-command messages
        if (!text.startsWith(".")) return

        const parts = text.slice(1).trim().split(/\s+/)
        const commandName = parts[0]
        const args = parts.slice(1).join(" ")

        const sender = msg.pushName || "User"

        try {

            const response = await handleCommand(commandName, sender, args)

            if (!response) return

            // MEDIA RESPONSE (VIDEO FILE)
            if (typeof response === "object" && response.file) {

                await sock.sendMessage(msg.key.remoteJid, {
                    text: response.text
                })

                await sock.sendMessage(msg.key.remoteJid, {
                    video: { url: response.file },
                    caption: "📥 Downloaded by Cobra"
                })

                return
            }
  

            // NORMAL TEXT RESPONSE
            await sock.sendMessage(msg.key.remoteJid, {
                text: String(response)
            })

        } catch (err) {

            console.log("Command error:", err)

            await sock.sendMessage(msg.key.remoteJid, {
                text: "⚠ Command failed"
            })

        }

    })

}

startBot()