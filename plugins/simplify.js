const axios = require("axios")

const languageMap = {
    english: "en",
    eng: "en",
    en: "en",
    tamil: "ta",
    ta: "ta",
    hindi: "hi",
    hi: "hi"
}

const languageLabel = {
    en: "English",
    ta: "Tamil",
    hi: "Hindi"
}

const stopWords = new Set([
    "the", "and", "for", "with", "this", "that", "from", "into", "have", "has", "had", "was", "were", "are", "is", "am", "will", "would", "shall", "can", "could", "should", "about", "there", "their", "them", "they", "you", "your", "yours", "our", "ours", "his", "her", "hers", "its", "not", "but", "also", "than", "then", "too", "very", "just", "more", "most", "some", "such", "only", "because", "while", "where", "when"
])

function splitSentences(text) {
    return text
        .replace(/\s+/g, " ")
        .trim()
        .split(/(?<=[.!?।])\s+/u)
        .map(sentence => sentence.trim())
        .filter(Boolean)
}

function tokenize(text) {
    return (text.toLowerCase().match(/\p{L}+/gu) || [])
        .filter(token => token.length > 2 && !stopWords.has(token))
}

function createSimpleSummary(text) {
    const sentences = splitSentences(text)

    if (sentences.length <= 2) {
        return {
            context: sentences[0] || text.trim(),
            summary: text.trim(),
            keyPoints: [text.trim()]
        }
    }

    const frequency = {}

    tokenize(text).forEach(token => {
        frequency[token] = (frequency[token] || 0) + 1
    })

    const scored = sentences.map((sentence, index) => {
        const words = tokenize(sentence)
        const frequencyScore = words.reduce((total, word) => total + (frequency[word] || 0), 0)
        const densityBonus = Math.min(6, words.length * 0.4)
        const positionBonus = index === 0 ? 2 : 0

        return {
            sentence,
            index,
            score: frequencyScore + densityBonus + positionBonus
        }
    })

    const keepCount = Math.max(2, Math.min(4, Math.ceil(sentences.length * 0.35)))

    const chosen = scored
        .sort((a, b) => b.score - a.score)
        .slice(0, keepCount)
        .sort((a, b) => a.index - b.index)
        .map(item => item.sentence)

    return {
        context: sentences[0],
        summary: chosen.join(" "),
        keyPoints: chosen.slice(0, 3)
    }
}

async function translateText(text, targetLang, forceTranslate = false) {
    if (!text) return text

    if (targetLang === "en" && !forceTranslate) return text

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
    const res = await axios.get(url, { timeout: 10000 })

    return res.data[0].map(item => item[0]).join("")
}

function parseInput(args) {
    let targetLang = "en"
    let text = args.trim()
    let explicitLanguageRequest = false

    const matchTo = text.match(/^to\s+(english|eng|en|tamil|ta|hindi|hi)\s+(.+)/i)
    const matchDirect = text.match(/^(english|eng|en|tamil|ta|hindi|hi)\s+(.+)/i)

    if (matchTo) {
        targetLang = languageMap[matchTo[1].toLowerCase()] || "en"
        text = matchTo[2].trim()
        explicitLanguageRequest = true
    } else if (matchDirect) {
        targetLang = languageMap[matchDirect[1].toLowerCase()] || "en"
        text = matchDirect[2].trim()
        explicitLanguageRequest = true
    }

    return { targetLang, text, explicitLanguageRequest }
}

module.exports = {
    name: "simplify",

    async execute(sock, msg, args) {
        try {
            const chatId = msg.key.remoteJid

            if (!args) {
                return `✂️ *COBRA SIMPLIFY*

Usage:
.simplify <long text>
.simplify tamil <long text>
.simplify hindi <long text>
.simplify to english <long text>`
            }

            await sock.sendMessage(chatId, {
                react: { text: "✂️", key: msg.key }
            })

            const { targetLang, text, explicitLanguageRequest } = parseInput(args)

            if (text.length < 40) {
                return "❌ Please send a longer passage (at least 40 characters) so I can simplify it clearly."
            }

            const { context, summary, keyPoints } = createSimpleSummary(text)

            let translatedContext = context
            let translatedSummary = summary
            let translatedPoints = keyPoints
            let note = ""

            const shouldForceEnglishTranslation = targetLang === "en" && explicitLanguageRequest

            if (targetLang !== "en" || shouldForceEnglishTranslation) {
                try {
                    const translatedPointText = await translateText(
                        keyPoints.join("\n"),
                        targetLang,
                        shouldForceEnglishTranslation
                    )

                    const [tContext, tSummary] = await Promise.all([
                        translateText(context, targetLang, shouldForceEnglishTranslation),
                        translateText(summary, targetLang, shouldForceEnglishTranslation)
                    ])

                    translatedContext = tContext
                    translatedSummary = tSummary
                    translatedPoints = translatedPointText.split("\n").filter(Boolean)
                } catch (translationError) {
                    console.log("SIMPLIFY TRANSLATION ERROR:", translationError)
                    note = "\n\n⚠ Translation service is busy. Showing result in detected language."
                }
            }

            const points = translatedPoints.slice(0, 3).map(point => `• ${point}`).join("\n")

            return `✂️ *COBRA SIMPLIFY*

🌐 *Language:* ${languageLabel[targetLang] || targetLang}

📌 *Short Context:*
${translatedContext}

📝 *Simple Summary:*
${translatedSummary}

🔎 *Key Points:*
${points}${note}`
        } catch (err) {
            console.log("SIMPLIFY ERROR:", err)
            return "⚠ Unable to simplify now. Please try again."
        }
    }
}
