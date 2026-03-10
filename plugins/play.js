const yts = require("yt-search")
const ytdlp = require("yt-dlp-exec")
const fs = require("fs")
const path = require("path")

module.exports = {
name: "play",

async execute(sock, msg, args, user, data, dbPath, analytics){

try{

const chatId = msg.key.remoteJid
const query = args

if(!query){
return "🎵 Example:\n.play believer"
}

const search = await yts(query)

if(!search.videos.length){
return "❌ Song not found"
}

const video = search.videos[0]

const title = video.title
const duration = video.timestamp
const thumbnail = video.thumbnail

await sock.sendMessage(chatId,{
image:{ url: thumbnail },
caption:
`🎵 *Cobra Music Downloader*\n\n`+
`📀 *Title:* ${title}\n`+
`⏱ *Duration:* ${duration}\n\n`+
`⬇ Downloading audio...`
},{ quoted: msg })

// ensure temp folder exists
const tempDir = path.join(__dirname,"../temp")
if(!fs.existsSync(tempDir)){
fs.mkdirSync(tempDir)
}

const filePath = path.join(tempDir,"song.mp3")

await ytdlp(video.url,{
extractAudio:true,
audioFormat:"mp3",
ffmpegLocation:"C:/Users/aswin/Desktop/ffmpeg-8.0.1-essentials_build/bin",
output:filePath
})

await sock.sendMessage(chatId,{
audio:{ url:filePath },
mimetype:"audio/mpeg",
fileName:title+".mp3"
},{ quoted: msg })

fs.unlinkSync(filePath)

return null

}catch(err){

console.log("PLAY ERROR:",err)

return "⚠ Failed to download song"

}

}
}