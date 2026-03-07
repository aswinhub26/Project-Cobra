const axios = require("axios")

module.exports = {
    name: "ig",

    async execute(user, url) {

        if (!url) {
            return `📸 Instagram Downloader

Usage:
.ig instagram_link

Example:
.ig https://www.instagram.com/reel/xxxx`
        }

        try {

            const api =
            `https://api.vreden.my.id/api/igdl?url=${encodeURIComponent(url)}`

            const res = await axios.get(api)

            const video = res.data.result[0].url

            return {
                video: { url: video },
                caption: "📸 Instagram Reel Downloaded"
            }

        } catch (err) {

            console.log("IG ERROR:", err)

            return "⚠ Failed to download Instagram video"
        }
    }
}