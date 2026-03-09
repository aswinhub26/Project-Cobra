const axios = require("axios")

module.exports = {
name: "gif",

async execute(user, query, data, dbPath, analytics, sock, msg) {

try {

if (!query) {
return "🎬 Example:\n.gif cat"
}

const res = await axios.get(`https://g.tenor.com/v1/search?q=${encodeURIComponent(query)}&key=LIVDSRZULELA&limit=10`)

const gifs = res.data?.results

if (!gifs || gifs.length === 0) {
return "❌ No GIF found"
}

// pick random gif
const random = gifs[Math.floor(Math.random() * gifs.length)]

const gifUrl = random.media[0].mp4.url

// download gif/video
const file = await axios.get(gifUrl, {
responseType: "arraybuffer"
})

await sock.sendMessage(msg.key.remoteJid, {
video: Buffer.from(file.data),
gifPlayback: true,
caption: `🎬 GIF for: *${query}*`
}, { quoted: msg })

return null

} catch (err) {

console.log("GIF ERROR:", err)

return "⚠ Failed to fetch GIF"

}

}
}