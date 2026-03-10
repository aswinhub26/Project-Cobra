const axios = require("axios")

module.exports = {
name: "gif",

async execute(sock, msg, args) {

try {

const chatId = msg.key.remoteJid

if (!args) {
return "🎬 Example:\n.gif cat"
}

const res = await axios.get(
`https://g.tenor.com/v1/search?q=${encodeURIComponent(args)}&key=LIVDSRZULELA&limit=10`,
{
headers: {
"User-Agent": "Mozilla/5.0"
}
}
)

const gifs = res.data?.results

if (!gifs || gifs.length === 0) {
return "❌ No GIF found"
}

// random gif
const random = gifs[Math.floor(Math.random() * gifs.length)]

const gifUrl = random.media[0].mp4.url

// download gif
const file = await axios.get(gifUrl, {
responseType: "arraybuffer"
})

await sock.sendMessage(chatId, {
video: Buffer.from(file.data),
gifPlayback: true,
caption: `🎬 GIF for: *${args}*`
}, { quoted: msg })

return null

} catch (err) {

console.log("GIF ERROR:", err.message)

return "⚠ Failed to fetch GIF"

}

}
}