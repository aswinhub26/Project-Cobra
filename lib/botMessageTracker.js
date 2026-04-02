const MAX_MESSAGES_PER_CHAT = 120

const chatMessageStore = new Map()

function normalizeKey(key = {}) {
    if (!key || !key.id || !key.remoteJid) return null

    return {
        remoteJid: key.remoteJid,
        fromMe: true,
        id: key.id,
        participant: key.participant
    }
}

function isDeletePayload(content) {
    return Boolean(content && typeof content === "object" && content.delete)
}

function trackBotMessage(chatId, messageKey) {
    const normalized = normalizeKey(messageKey)
    if (!chatId || !normalized) return false

    const existing = chatMessageStore.get(chatId) || []
    existing.push(normalized)

    if (existing.length > MAX_MESSAGES_PER_CHAT) {
        existing.splice(0, existing.length - MAX_MESSAGES_PER_CHAT)
    }

    chatMessageStore.set(chatId, existing)
    return true
}

function getTrackedMessages(chatId) {
    return [...(chatMessageStore.get(chatId) || [])]
}

function clearTrackedMessages(chatId, count) {
    const existing = chatMessageStore.get(chatId) || []
    if (!existing.length) return []

    const removeCount = count === "all"
        ? existing.length
        : Math.min(Math.max(Number(count) || 0, 0), existing.length)

    if (removeCount <= 0) return []

    const removed = existing.splice(existing.length - removeCount, removeCount)
    chatMessageStore.set(chatId, existing)

    return removed.reverse()
}

module.exports = {
    isDeletePayload,
    trackBotMessage,
    getTrackedMessages,
    clearTrackedMessages
}
