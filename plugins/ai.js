const Groq = require("groq-sdk")

function getGroqClient() {
    const apiKey = process.env.GROQ_API_KEY

    if (!apiKey) {
        return null
    }

    return new Groq({ apiKey })
}

module.exports = {
    name: "ai",

    async execute(sock, msg, args, user, data, dbPath, analytics) {
        try {
            const chatId = msg.key.remoteJid
            const query = String(args || "").trim()

            if (!query) {
                return `🤖 *Cobra AI Assistant*\n\n✨ Ask anything!\n\nExample:\n.ai explain cybersecurity\n.ai write a HTML code\n.ai tell me a tech joke`
            }

            const groq = getGroqClient()

            if (!groq) {
                return "⚠️ GROQ_API_KEY is not configured yet. Add it to your environment to use .ai."
            }

            await sock.sendMessage(chatId, {
                react: { text: "🧠", key: msg.key }
            })

            await sock.sendPresenceUpdate("composing", chatId)

            const completion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "You are Cobra AI 🤖, a smart assistant built for a WhatsApp bot. Answer clearly and helpfully."
                    },
                    {
                        role: "user",
                        content: query
                    }
                ],
                model: "llama-3.1-8b-instant"
            })

            const answer = completion.choices?.[0]?.message?.content || "⚠️ No response received from Cobra AI."

            await sock.sendMessage(chatId, {
                text: `🧠 *Cobra AI Response*\n\n${answer}\n\n⚡ Powered by AshGPT`
            }, { quoted: msg })

            return null
        } catch (err) {
            console.log("AI ERROR:", err)
            return "❌ ⚠️ Cobra AI service temporarily unavailable"
        }
    }
}
