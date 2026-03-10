const yts = require("yt-search")
const ytdlp = require("yt-dlp-exec")
const fs = require("fs")
const path = require("path")

module.exports = {

name: "video",

async execute(sock,msg,args){

try{

const chatId = msg.key.remoteJid

if(!args){
return `🎬 *Cobra Video Downloader*

Usage:
.video video name
.video video name 720
.video youtube_link
.video youtube_link 360

Example:
.video believer 720`
}

// default quality
let quality = "720"
let query = args

// detect quality
const parts = args.split(" ")

if(parts.length > 1 && ["360","720","1080"].includes(parts[parts.length-1])){
quality = parts.pop()
query = parts.join(" ")
}

let format = "bestvideo[height<=720]+bestaudio/best"

if(quality === "360") format = "bestvideo[height<=360]+bestaudio/best"
if(quality === "720") format = "bestvideo[height<=720]+bestaudio/best"
if(quality === "1080") format = "bestvideo[height<=1080]+bestaudio/best"

await sock.sendMessage(chatId,{
react:{ text:"⏳", key:msg.key }
})

let videoUrl = ""
let title = ""
let thumb = ""

// detect youtube link
if(query.includes("youtube.com") || query.includes("youtu.be")){

videoUrl = query

// fix shorts link
if(videoUrl.includes("shorts/")){
videoUrl = videoUrl.replace("shorts/","watch?v=")
}

}else{

const search = await yts(query)

if(!search.videos.length){
return "❌ No videos found"
}

videoUrl = search.videos[0].url
title = search.videos[0].title
thumb = search.videos[0].thumbnail

}

// send preview
if(thumb){

await sock.sendMessage(chatId,{
image:{url:thumb},
caption:
`🎬 *${title || query}*

📺 Quality: ${quality}p
⬇ Downloading video...`
},{quoted:msg})

}

const tempDir = path.join(__dirname,"../temp")

if(!fs.existsSync(tempDir)){
fs.mkdirSync(tempDir)
}

const filePath = path.join(tempDir,"cobra_video.mp4")

// download video
await ytdlp(videoUrl,{
format: format,
mergeOutputFormat:"mp4",
ffmpegLocation:"C:/Users/aswin/Desktop/ffmpeg-8.0.1-essentials_build/bin",
output:filePath
})

await sock.sendMessage(chatId,{
text:"📤 Uploading video..."
},{quoted:msg})

// send video
await sock.sendMessage(chatId,{
video:{url:filePath},
caption:`🎬 *${title || "Video"}*

📺 Quality: ${quality}p
🐍 Downloaded by Cobra`
},{quoted:msg})

// delete temp file
fs.unlinkSync(filePath)

}catch(err){

console.log("VIDEO ERROR:",err)

return "❌ Failed to download video"

}

}

}