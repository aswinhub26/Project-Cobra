const { downloadContentFromMessage } = require("@whiskeysockets/baileys")

module.exports = {
name: "viewonce",

async execute(user, args, data, dbPath, analytics, sock, msg) {

try {

const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage

if (!quoted) {
return "❌ Reply to a view-once image or video"
}

const image = quoted.imageMessage
const video = quoted.videoMessage

if (image && image.viewOnce) {

const stream = await downloadContentFromMessage(image, "image")

let buffer = Buffer.from([])
for await (const chunk of stream) {
buffer = Buffer.concat([buffer, chunk])
}

await sock.sendMessage(msg.key.remoteJid, {
image: buffer,
caption: image.caption || "📥 View Once Image"
}, { quoted: msg })

return null
}

if (video && video.viewOnce) {

const stream = await downloadContentFromMessage(video, "video")

let buffer = Buffer.from([])
for await (const chunk of stream) {
buffer = Buffer.concat([buffer, chunk])
}

await sock.sendMessage(msg.key.remoteJid, {
video: buffer,
caption: video.caption || "📥 View Once Video"
}, { quoted: msg })

return null
}

return "❌ This is not a view-once media"

} catch (err) {

console.log("ViewOnce Error:", err)

return "⚠ Failed to fetch view-once media"

}

}
}