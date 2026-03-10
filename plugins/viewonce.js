const { downloadContentFromMessage } = require("@whiskeysockets/baileys")

module.exports = {
name: "viewonce",

async execute(sock, msg, args, user, data, dbPath, analytics){

try{

const chatId = msg.key.remoteJid

// ⏳ loading reaction
await sock.sendMessage(chatId,{
react:{ text:"👁️", key: msg.key }
})

// get quoted message
const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage

if(!quoted){
return "❌ Reply to a *view-once* image or video"
}

const image = quoted.imageMessage
const video = quoted.videoMessage

// IMAGE
if(image && image.viewOnce){

const stream = await downloadContentFromMessage(image,"image")

let buffer = Buffer.from([])
for await(const chunk of stream){
buffer = Buffer.concat([buffer,chunk])
}

await sock.sendMessage(chatId,{
image: buffer,
caption: image.caption || "👁️ *View Once Image Unlocked*"
},{ quoted: msg })

return null
}

// VIDEO
if(video && video.viewOnce){

const stream = await downloadContentFromMessage(video,"video")

let buffer = Buffer.from([])
for await(const chunk of stream){
buffer = Buffer.concat([buffer,chunk])
}

await sock.sendMessage(chatId,{
video: buffer,
caption: video.caption || "👁️ *View Once Video Unlocked*"
},{ quoted: msg })

return null
}

return "❌ This is not a view-once media"

}catch(err){

console.log("VIEWONCE ERROR:", err)

return "⚠ Failed to fetch view-once media"

}

}
}