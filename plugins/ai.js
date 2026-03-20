const Groq = require("groq-sdk")

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
})

module.exports = {
name: "ai",

async execute(sock, msg, args, user, data, dbPath, analytics){

try{

const chatId = msg.key.remoteJid
const query = args

if(!query){
return `🤖 *Cobra AI Assistant*

✨ Ask anything!

Example:
.ai explain cybersecurity
.ai write a HTML code
.ai tell me a tech joke`
}

// React to message
await sock.sendMessage(chatId,{
react:{ text:"🧠", key: msg.key }
})

// typing indicator
await sock.sendPresenceUpdate("composing", chatId)

const completion = await groq.chat.completions.create({
messages:[
{
role:"system",
content:"You are Cobra AI 🤖, a smart assistant built for a WhatsApp bot. Answer clearly and helpfully."
},
{
role:"user",
content: query
}
],
model:"llama-3.1-8b-instant"
})

const answer = completion.choices[0].message.content

await sock.sendMessage(chatId,{
text:`🧠 *Cobra AI Response*\n\n${answer}\n\n⚡ Powered by AshGPT`
},{ quoted: msg })

return null

}catch(err){

console.log("AI ERROR:",err)

return "❌ ⚠️ Cobra AI service temporarily unavailable"

}

}

}