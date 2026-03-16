module.exports = {
    name: "hack",

    async execute(sock, msg, args, user, data, dbPath, analytics) {
        const chatId = msg.key.remoteJid;
        const isGroup = chatId.endsWith("@g.us");
        const quoted = msg.message?.extendedTextMessage?.contextInfo;

        const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        function cleanName(name, jid) {
            if (!name) return null;

            const trimmed = String(name).trim();

            // If Baileys only returned the raw number/JID, hide it
            const onlyNumber = jid
                ? trimmed === jid || trimmed === jid.split("@")[0]
                : /^\d+$/.test(trimmed);

            if (!trimmed || onlyNumber || /^\d+$/.test(trimmed)) {
                return null;
            }

            return trimmed;
        }

        async function resolveTargetName() {
            try {
                if (isGroup) {
                    if (quoted?.participant) {
                        const jid = quoted.participant;

                        const contactName =
                            sock.contacts?.[jid]?.name ||
                            sock.contacts?.[jid]?.notify ||
                            sock.contacts?.[jid]?.verifiedName;

                        const fromStore = cleanName(contactName, jid);
                        if (fromStore) return fromStore;

                        const fromGetName = cleanName(await sock.getName(jid), jid);
                        if (fromGetName) return fromGetName;

                        return "This User";
                    }

                    const senderJid =
                        msg.key.participant ||
                        msg.participant ||
                        msg.key.remoteJid;

                    const contactName =
                        sock.contacts?.[senderJid]?.name ||
                        sock.contacts?.[senderJid]?.notify ||
                        sock.contacts?.[senderJid]?.verifiedName;

                    const fromStore = cleanName(contactName, senderJid);
                    if (fromStore) return fromStore;

                    const fromGetName = cleanName(await sock.getName(senderJid), senderJid);
                    if (fromGetName) return fromGetName;

                    return msg.pushName || "This User";
                }

                // Private chat: other person's name is often not exposed reliably.
                // Try contact store first.
                const contactName =
                    sock.contacts?.[chatId]?.name ||
                    sock.contacts?.[chatId]?.notify ||
                    sock.contacts?.[chatId]?.verifiedName;

                const fromStore = cleanName(contactName, chatId);
                if (fromStore) return fromStore;

                const fromGetName = cleanName(await sock.getName(chatId), chatId);
                if (fromGetName) return fromGetName;

                return "This User";
            } catch {
                return isGroup ? (msg.pushName || "This User") : "This User";
            }
        }

        const targetName = await resolveTargetName();

        const steps = [
            "🐍 *COBRA CYBER CORE INITIALIZING*",
            `🎯 Target locked: *${targetName}*`,
            "📡 Scanning device fingerprints...",
            "🛰️ Establishing encrypted tunnel...",
            "🧬 Injecting Cobra venom payload...",
            "🔓 Bypassing firewall layers...",
            "📁 Accessing hidden directories... *10%*",
            "🖼️ Extracting media cache... *20%*",
            "🎞️ Parsing video archives... *30%*",
            "🎧 Collecting audio signatures... *40%*",
            "💬 Decrypting WhatsApp backups... *50%*",
            "📇 Mapping contact database... *60%*",
            "🗂️ Recovering hidden files... *70%*",
            "☁️ Syncing remote Cobra server... *80%*",
            "📤 Uploading extracted packets... *90%*",
            "💀 System breach complete... *100%*",
            "🧹 Cleaning activity logs...",
            "🗑️ Destroying temporary payload...",
            "🐍 *COBRA MISSION COMPLETE*",
            `📦 Data successfully extracted from *${targetName}*`
        ];

        try {
            await sock.sendMessage(
                chatId,
                {
                    text: `🕷️ *COBRA HACK SIMULATOR*\n\n🎯 Target: *${targetName}*\n⚠️ Warning This May Crash The Whole Server\n\n🚀 Starting cyber attack...`
                },
                { quoted: msg }
            );

            for (const step of steps) {
                await sleep(2000);
                await sock.sendMessage(
                    chatId,
                    { text: step },
                    { quoted: msg }
                );
            }

            return null;
        } catch (err) {
            console.log("HACK ERROR:", err);
            return "⚠️ Cobra hack animation failed.";
        }
    }
};
