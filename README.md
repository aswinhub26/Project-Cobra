# 🐍 Project Cobra

Project Cobra is a modular WhatsApp automation engine built with **Node.js** and **Baileys**.
It uses a **command-driven architecture** + **plugin system** so new capabilities can be added quickly.

---

## 🚀 Core Features

- 🧩 Modular command handler
- 🔌 Dynamic plugin loading
- ⏱️ Command cooldown protection
- 📊 Command analytics tracking
- 📝 Command usage logging
- 💾 JSON-based local database
- 🔄 Plugin hot-reload support
- 👥 Group moderation and utility controls

---

## 👑 Role-Based Access

| Role | Access |
| --- | --- |
| 👑 Owner | Full bot control |
| 🛡️ Admin | Group moderation + management commands |
| 👤 User | Standard utility, AI, and media commands |

---

## ⚙️ Command List (Updated)

### 🧠 Core Commands

| Command | Feature |
| --- | --- |
| `.ping` | Quick health check (bot alive) |
| `.alive` | Status card with uptime + mode + version |
| `.menu` | Auto-generated command dashboard |
| `.about` | Bot and stack information |
| `.stats` | Runtime analytics summary |
| `.cobra install <plugin>` | Install plugin from Cobra plugin repository |

### 👥 Group & Moderation Commands

| Command | Feature |
| --- | --- |
| `.kick` | Remove a replied user from group |
| `.ban` | Ban a user in bot database (owner-level action) |
| `.warn <reason>` | Warn replied user; auto-kick at warn limit |
| `.tagall` | Mention all participants in a group |
| `.groupinfo` | Show group metadata (owner/admins/members/settings) |
| `.promote` | Promote replied user to admin |
| `.demote` | Demote replied admin |
| `.mute` | Set group to admin-only messaging |
| `.unmute` | Re-open group messaging for all members |

### 🎮 Game Commands

| Command | Feature |
| --- | --- |
| `.quiz` | Random quiz challenge |
| `.quiz <id> <option>` | Submit quiz answer |
| `.rps <rock\|paper\|scissors>` | Rock-paper-scissors with bot |
| `.ttt` | Tic-tac-toe session command |

---

## 🔌 Plugin Commands (Updated)

### 🤖 AI & Smart Tools

| Command | Feature |
| --- | --- |
| `.ai <prompt>` | Chat with Cobra AI assistant |
| `.simplify <text>` | Summarize and simplify long text |
| `.translate <text> to <language>` | Translate text to target language |
| `.image <prompt>` | Generate AI image from prompt |
| `.schedule ...` | Group reminder scheduling (list/cancel/time-based) |

### 📥 Media, Download & Utility

| Command | Feature |
| --- | --- |
| `.play <song>` | Download audio from YouTube search/link |
| `.video <query/link> [360\|720\|1080]` | Download YouTube video with quality option |
| `.ig <instagram_link>` | Download Instagram reel/post media |
| `.gif <query>` | Search and send GIF |
| `.viewonce` | Reveal replied view-once image/video |
| `.removebg` | Remove background from replied image |
| `.sticker` | Create sticker from replied media / prompt |
| `.dld <link>` | Universal social media downloader |
| `.autostatus on/off/status/<link>` | Auto-post supported links to status |
| `.weather <city>` | Live weather lookup |
| `.news [english\|tamil]` | Fetch top headlines |
| `.hack <target>` | Fun simulated hack-style response command |

---

## 🔥 AutoStatus Supported Platforms

- YouTube / Shorts
- Instagram / Reels
- Facebook / Reels
- ShareChat
- Moj

State file:

`database/autostatus.json`

---

## 🏗️ Project Structure

```text
Project-Cobra/
├── whatsapp.js
├── commandHandler.js
├── commands/
├── plugins/
├── database/
├── logs/
└── auth/
```

---

## ⚡ Installation

```bash
git clone https://github.com/aswinhub26/Project-Cobra.git
cd Project-Cobra
npm install
node whatsapp.js
```

Then scan the QR code from WhatsApp.

---

## 📌 Notes

- Use the `.` prefix for all commands.
- Some commands require **group admin** or **owner** permissions.
- Plugins are loaded from the `plugins/` folder automatically.
