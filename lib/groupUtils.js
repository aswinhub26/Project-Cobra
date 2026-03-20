async function getGroupMetadata(sock, chatId) {
    try {
        return await sock.groupMetadata(chatId)
    } catch {
        return {}
    }
}

function isGroupChat(jid) {
    return jid?.endsWith("@g.us")
}

function listAdminJids(metadata) {
    return (metadata?.participants || [])
        .filter(p => p.admin)
        .map(p => p.id)
}

function mentionTag(jid) {
    return `@${jid.split("@")[0]}`
}

function participantName(metadata, jid) {
    const user = metadata?.participants?.find(p => p.id === jid)
    return user?.notify || user?.name || jid.split("@")[0]
}

module.exports = {
    getGroupMetadata,
    isGroupChat,
    listAdminJids,
    mentionTag,
    participantName
}