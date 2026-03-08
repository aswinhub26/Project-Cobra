const yts = require("yt-search")
const axios = require("axios")

module.exports = {

name: "play",

async execute(user, query, data, dbPath, analytics, sock, msg) {

    try {

        if (!query) {
            return "🎵 What song do you want to download?\nExample: .play shape of you"
        }

        const { videos } = await yts(query)

        if (!videos || videos.length === 0) {
            return "❌ No songs found"
        }

        const video = videos[0]
        const urlYt = video.url

        await sock.sendMessage(msg.key.remoteJid, {
            text: "⏳ Please wait, downloading your song..."
        })

        const response = await axios.get(
            `https://apis-keith.vercel.app/download/dlmp3?url=${urlYt}`
        )

        const dataApi = response.data

        if (!dataApi?.status || !dataApi?.result?.downloadUrl) {
            return "❌ Failed to fetch audio"
        }

        const audioUrl = dataApi.result.downloadUrl
        const title = dataApi.result.title

        await sock.sendMessage(msg.key.remoteJid, {
            audio: { url: audioUrl },
            mimetype: "audio/mpeg",
            fileName: title + ".mp3"
        })

        return null

    } catch (error) {

        console.error("Play command error:", error)

        return "⚠ Download failed"
    }

}
}