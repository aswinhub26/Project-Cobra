require("dotenv").config()

const Groq = require("groq-sdk")

// check API key
if (!process.env.GROQ_API_KEY) {

module.exports = {
    name: "ask",

    async execute() {
        return "⚠ GROQ_API_KEY missing in .env"
    }
}

return
}

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
})

module.exports = {

name: "ask",

async execute(user, question) {

    if (!question) {
        return "❌ Ask something.\nExample: .ask what is cybersecurity"
    }

    try {

        const response = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: question
                }
            ],
            model: "llama-3.1-8b-instant"
        })

        return response.choices[0].message.content

    } catch (error) {

        console.log("AI ERROR:", error)

        return "⚠ AI service error"
    }

}

}