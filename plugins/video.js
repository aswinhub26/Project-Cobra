const axios = require("axios")
const yts = require("yt-search")

const AXIOS_DEFAULTS = {
timeout:60000,
headers:{
"User-Agent":"Mozilla/5.0",
"Accept":"application/json"
}
}

async function tryRequest(getter,attempts=3){

let lastError

for(let i=1;i<=attempts;i++){

try{
return await getter()
}
catch(err){

lastError=err

if(i<attempts){
await new Promise(r=>setTimeout(r,1000*i))
}

}

}

throw lastError
}

async function getElite(url){

const api=`https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(url)}&format=mp4`

const res=await tryRequest(()=>axios.get(api,AXIOS_DEFAULTS))

if(res?.data?.success && res?.data?.downloadURL){

return{
download:res.data.downloadURL,
title:res.data.title
}

}

throw new Error("Elite failed")

}

async function getYupra(url){

const api=`https://api.yupra.my.id/api/downloader/ytmp4?url=${encodeURIComponent(url)}`

const res=await tryRequest(()=>axios.get(api,AXIOS_DEFAULTS))

if(res?.data?.data?.download_url){

return{
download:res.data.data.download_url,
title:res.data.data.title
}

}

throw new Error("Yupra failed")

}

async function getOkatsu(url){

const api=`https://okatsu-rolezapiiz.vercel.app/downloader/ytmp4?url=${encodeURIComponent(url)}`

const res=await tryRequest(()=>axios.get(api,AXIOS_DEFAULTS))

if(res?.data?.result?.mp4){

return{
download:res.data.result.mp4,
title:res.data.result.title
}

}

throw new Error("Okatsu failed")

}

module.exports = {

name:"video",

async execute(sock,msg,args){

try{

const chatId = msg.key.remoteJid

if(!args){

await sock.sendMessage(chatId,{
text:"🎬 Send video name or YouTube link\nExample:\n.video Believer"
},{quoted:msg})

return
}

let videoUrl=""
let title=""
let thumb=""

if(args.startsWith("http")){

videoUrl=args

}else{

const {videos} = await yts(args)

if(!videos.length){

await sock.sendMessage(chatId,{
text:"❌ No videos found"
},{quoted:msg})

return
}

videoUrl = videos[0].url
title = videos[0].title
thumb = videos[0].thumbnail

}

if(thumb){

await sock.sendMessage(chatId,{
image:{url:thumb},
caption:`🎬 *${title || args}*\nDownloading...`
},{quoted:msg})

}

let data

const apis=[
()=>getElite(videoUrl),
()=>getYupra(videoUrl),
()=>getOkatsu(videoUrl)
]

for(const api of apis){

try{

data = await api()

if(data.download) break

}catch{}

}

if(!data){

throw new Error("All APIs failed")

}

await sock.sendMessage(chatId,{
video:{url:data.download},
mimetype:"video/mp4",
caption:`🎬 *${data.title || title || "Video"}*\n\n🐍 Downloaded by Cobra`
},{quoted:msg})

}
catch(err){

console.log("VIDEO ERROR:",err.message)

await sock.sendMessage(msg.key.remoteJid,{
text:"❌ Failed to download video"
},{quoted:msg})

}

}

}