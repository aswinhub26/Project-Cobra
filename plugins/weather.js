const axios = require("axios")

module.exports = {
name: "weather",

async execute(sock, msg, args){

try{

const chatId = msg.key.remoteJid
const city = args

if(!city){
return "🌦 Usage: .weather city\nExample: .weather london"
}

// ⏳ Loading reaction
await sock.sendMessage(chatId,{
react:{ text:"⏳", key: msg.key }
})

// ✍ Typing indicator
await sock.sendPresenceUpdate("composing", chatId)

// 1️⃣ Get city coordinates
const geo = await axios.get(
`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`,
{ timeout: 5000 }
)

if(!geo.data.results){
return "❌ City not found"
}

const place = geo.data.results[0]

// 2️⃣ Get weather
const weatherRes = await axios.get(
`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current_weather=true`,
{ timeout: 5000 }
)

const weather = weatherRes.data.current_weather

// 🌤 Weather condition emoji logic
let emoji = "🌤"

if(weather.temperature > 35) emoji = "🔥"
else if(weather.temperature < 10) emoji = "❄"
else if(weather.windspeed > 30) emoji = "🌪"

return `${emoji} *Weather Report*

📍 Location: ${place.name}, ${place.country}
🌡 Temperature: ${weather.temperature}°C
💨 Wind Speed: ${weather.windspeed} km/h
🧭 Wind Direction: ${weather.winddirection}°

⚡ Powered by Cobra Weather`

}catch(err){

console.log("WEATHER ERROR:",err)

return "⚠ Weather service unavailable"

}

}
}