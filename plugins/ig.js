const ytdlp = require("yt-dlp-exec")

module.exports = {
    name: "ig",

    async execute(user, url) {

        if (!url) {
            return `📸 *Instagram Downloader*

Usage:
.ig instagram_link

Example:
.ig https://www.instagram.com/reel/xxxx`
        }

        try {

            const info = await ytdlp(url, {
                dumpSingleJson: true
            })

            const video = info.url

            return {
                video: { url: video },
                caption: "📥 Instagram Reel Downloaded 🐍"
            }

        } catch (err) {

            console.log("IG ERROR:", err.message)

            return "⚠ Failed to download Instagram video"
        }
    }
}