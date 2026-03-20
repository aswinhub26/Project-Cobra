require("dotenv").config();

const fs = require("fs");
const path = require("path");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason
} = require("@whiskeysockets/baileys");

const qrcode = require("qrcode-terminal");
const pino = require("pino");
const handleCommand = require("./commandHandler");
const settings = require("./settings");
const autoStatusPlugin = require("./plugins/autostatus");
const groupAutomationPlugin = require("./plugins/groupAutomation");

let bannerSent = false;

async function sendConnectedBanner(sock) {
    try {
        const ownerJid = `${settings.owner[0]}@s.whatsapp.net`;
        const imagePath = path.join(__dirname, "assets", "cobra.jpg");

        if (!fs.existsSync(imagePath)) {
            console.log("❌ Banner image not found:", imagePath);
            return;
        }

        const caption = `╔══════════════════════════════╗
        🐍 PROJECT COBRA
╚══════════════════════════════╝

✅ *Cobra Connected Successfully*
⚡ *Bot is now online and active*

👋 Hello *${settings.ownerName}*
Your bot is now connected to WhatsApp.

🚀 *System Status*
• Bot Name: ${settings.botName}
• Version: ${settings.version}
• Mode: ${settings.mode}
• Connection: Active

🔥 *Loaded Features*
• 🤖 AI Assistant
• 🎥 Video Downloader
• 🎵 Music Downloader
• 📸 Instagram Downloader
• 🌍 Translator
• 🌤 Weather
• 🖼 Sticker Maker
• 😂 GIF Search

📌 Type *.menu* to view all commands

🐍 *Project Cobra is ready to serve you.*`;

        await sock.sendMessage(ownerJid, {
            image: fs.readFileSync(imagePath),
            mimetype: "image/jpeg",
            caption
        });

        console.log("📢 Cobra banner sent successfully");
    } catch (err) {
        console.log("❌ Banner error:", err);
    }
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("auth");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: "silent" }),
        browser: ["Project Cobra", "Chrome", "1.0"]
    });

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log("\n📱 Scan this QR with WhatsApp\n");
            qrcode.generate(qr, { small: true });
        }

        if (connection === "open") {
            console.log("🐍 Project Cobra connected to WhatsApp!");

            if (!bannerSent) {
                bannerSent = true;
                sendConnectedBanner(sock).catch((err) =>
                    console.log("❌ Banner background error:", err)
                );
            }
        }

        if (connection === "close") {
            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

            console.log("⚠ Connection closed. Reconnecting:", shouldReconnect);

            if (shouldReconnect) {
                startBot();
            }
        }
    });

    sock.ev.on("creds.update", saveCreds);

    groupAutomationPlugin.startScheduledDispatcher(sock);

    sock.ev.on("group-participants.update", async (update) => {
        await groupAutomationPlugin.handleGroupParticipantsUpdate(sock, update);
    });

    sock.ev.on("messages.delete", async (payload) => {
        await groupAutomationPlugin.handleMessageDelete(sock, payload);
    });

    sock.ev.on("messages.upsert", async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg?.message) return;

            const text =
                msg.message.conversation ||
                msg.message.extendedTextMessage?.text ||
                msg.message.imageMessage?.caption ||
                msg.message.videoMessage?.caption ||
                msg.message.documentMessage?.caption ||
                "";

            await groupAutomationPlugin.handleIncomingMessage(sock, msg, text);

            if (!text) return;

            const isFromMe = msg.key.fromMe;

            // Ignore own normal messages, but allow own commands like .menu / .sticker
            if (isFromMe && !text.startsWith(".")) return;

            console.log("Message received:", text);

            if (!text.startsWith(".")) {
                await autoStatusPlugin.handleAutoStatusMessage(sock, msg, text);
                return;
            }

            const parts = text.slice(1).trim().split(/\s+/);
            const commandName = parts[0].toLowerCase();
            const args = parts.slice(1).join(" ");
            const sender = msg.pushName || "User";

            const response = await handleCommand(sock, msg, commandName, sender, args);

            if (!response) return;

            if (typeof response === "object" && response.file) {
                if (response.text) {
                    await sock.sendMessage(msg.key.remoteJid, {
                        text: response.text
                    });
                }

                await sock.sendMessage(msg.key.remoteJid, {
                    video: { url: response.file },
                    caption: "📥 Downloaded by Cobra"
                });

                return;
            }

            await sock.sendMessage(msg.key.remoteJid, {
                text: String(response)
            });
        } catch (err) {
            console.log("Command error:", err);

            try {
                await sock.sendMessage(messages[0].key.remoteJid, {
                    text: "⚠ Command failed"
                });
            } catch (sendErr) {
                console.log("Reply send error:", sendErr);
            }
        }
    });
}

startBot();