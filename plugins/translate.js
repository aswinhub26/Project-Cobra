const axios = require("axios")

const languageMap = {
english:"en",
tamil:"ta",
hindi:"hi",
french:"fr",
spanish:"es",
german:"de",
chinese:"zh",
japanese:"ja",
korean:"ko",
arabic:"ar",
malayalam:"ml",
telugu:"te",
kannada:"kn"
}

module.exports = {

name:"translate",

async execute(sock,msg,args){

try{

const chatId = msg.key.remoteJid

if(!args){

return `🌍 *COBRA TRANSLATOR*

Usage:
.translate hello to tamil
.translate hello fr
.translate வணக்கம் to english`
}

await sock.sendMessage(chatId,{
react:{ text:"🌐", key:msg.key }
})

await sock.sendMessage(chatId,{
text:"🔄 Translating..."
},{quoted:msg})

let text=""
let targetLang=""

if(args.includes(" to ")){

const parts=args.split(" to ")

text=parts[0].trim()

const langName=parts[1].trim().toLowerCase()

targetLang=languageMap[langName] || langName

}else{

const parts=args.split(" ")

targetLang=parts.pop()

text=parts.join(" ")
}

if(!text || !targetLang){
return "❌ Usage: .translate hello to tamil"
}

// GOOGLE TRANSLATE API
const url=`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`

const res = await axios.get(url)

const translated = res.data[0].map(t => t[0]).join("")

return `🌍 *COBRA TRANSLATOR*

📝 *Original*
${text}

🌐 *Language*
${targetLang}

✨ *Translation*
${translated}

⚡ Powered by Cobra`

}catch(err){

console.log("TRANSLATE ERROR:",err)

return "⚠ Translation failed"

}

}

}