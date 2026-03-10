const ytdlp = require("yt-dlp-exec")
const fs = require("fs")
const path = require("path")

module.exports = {

name: "ig",

async execute(sock, msg, args){

try{

const chatId = msg.key.remoteJid

if(!args){

return `📥 *COBRA INSTAGRAM DOWNLOADER*

Usage:
.ig instagram_link

Examples:
.ig https://www.instagram.com/reel/xxxxx
.ig https://www.instagram.com/p/xxxxx
`
}

// reaction
await sock.sendMessage(chatId,{
react:{ text:"📥", key: msg.key }
})

// loading message
await sock.sendMessage(chatId,{
text:"⏳ Fetching Instagram media..."
},{quoted:msg})

// temp folder
const tempDir = path.join(__dirname,"../temp")

if(!fs.existsSync(tempDir)){
fs.mkdirSync(tempDir)
}

// unique file name
const filePath = path.join(tempDir,`ig_${Date.now()}.mp4`)

// download
await ytdlp(args,{
output:filePath,
format:"mp4"
})

// sending message
await sock.sendMessage(chatId,{
text:"📤 Uploading video..."
},{quoted:msg})

// send media
await sock.sendMessage(chatId,{
video:{url:filePath},
caption:`📥 *Instagram Video*

🐍 Downloaded by Cobra`
},{quoted:msg})

// delete temp file
fs.unlinkSync(filePath)

return null

}catch(err){

console.log("IG ERROR:",err)

return "⚠ Failed to download Instagram media"

}

}

}