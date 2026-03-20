const fs = require("fs");
const path = require("path");
const {
    getGroupMetadata,
    isGroupChat,
    listAdminJids,
    mentionTag
} = require("../lib/groupUtils");

const WARN_PATH = path.join(__dirname, "..", "database", "warnings.json");
const MAX_WARNS = 3;

function loadWarnings() {
    try {
        if (!fs.existsSync(WARN_PATH)) {
            fs.writeFileSync(WARN_PATH, JSON.stringify({}, null, 2));
        }
        return JSON.parse(fs.readFileSync(WARN_PATH, "utf8"));
    } catch {
        return {};
    }
}

function saveWarnings(data) {
    fs.writeFileSync(WARN_PATH, JSON.stringify(data, null, 2));
}

module.exports = {
    name: "warn",

    async execute(sock, msg, args, user, data, dbPath, analytics) {
        try {
            const chatId = msg.key.remoteJid;
            const sender = msg.key.participant || msg.key.remoteJid;

            if (!isGroupChat(chatId)) {
                return "❌ This command works only in groups";
            }

            const metadata = await getGroupMetadata(sock, chatId);
            const admins = listAdminJids(metadata);

            if (!admins.includes(sender)) {
                return "⚠️ Only group admins can use this command";
            }

            const target =
                msg.message?.extendedTextMessage?.contextInfo?.participant;

            if (!target) {
                return "⚠️ Reply to a user to warn them";
            }

            if (admins.includes(target)) {
                return "⚠️ You cannot warn another admin";
            }

            const reason = String(args || "").trim() || "No reason provided";
            const warnings = loadWarnings();

            if (!warnings[chatId]) warnings[chatId] = {};
            if (!warnings[chatId][target]) warnings[chatId][target] = 0;

            warnings[chatId][target] += 1;
            const count = warnings[chatId][target];

            saveWarnings(warnings);

            if (count >= MAX_WARNS) {
                try {
                    await sock.groupParticipantsUpdate(chatId, [target], "remove");
                    delete warnings[chatId][target];
                    saveWarnings(warnings);

                    return `🚨 *WARN LIMIT REACHED*

👤 User: ${mentionTag(target)}
📊 Warns: ${MAX_WARNS}/${MAX_WARNS}
📌 Reason: ${reason}

🥾 User has been kicked from the group.`;
                } catch (err) {
                    return `⚠️ User reached ${MAX_WARNS} warns, but I failed to kick them.\n\n👤 ${mentionTag(target)}`;
                }
            }

            const left = MAX_WARNS - count;

            return `⚠️ *USER WARNED*

👤 User: ${mentionTag(target)}
📊 Warn Count: ${count}/${MAX_WARNS}
📝 Reason: ${reason}
⏳ Warns left before kick: ${left}`;
        } catch (err) {
            console.log("WARN ERROR:", err);
            return "⚠️ Failed to warn user";
        }
    }
};