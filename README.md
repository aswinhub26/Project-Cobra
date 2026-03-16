🐍 𝙋𝙧𝙤𝙟𝙚𝙘𝙩 𝘾𝙤𝙗𝙧𝙖

Project Cobra is a modular WhatsApp automation engine built using **Node.js** and **Baileys**.

It demonstrates how modern chatbot frameworks, automation engines, and bot platforms are designed using **command-driven architecture** and **plugin-based modules**.

This project simulates real-world backend systems used in chatbots, automation tools, and messaging bots.

---

# 🚀 Features

## ⚙ Core System

- 🧩 Modular command architecture
- 🔌 Dynamic plugin loader
- ⏳ Command cooldown system
- 📊 Command analytics tracking
- 🗂 JSON database user management
- 📝 Command logging system
- ⚡ Real-time WhatsApp automation

---

# 👑 Role-Based Permissions

Project Cobra includes **multi-level access control**.

| Role | Access |
|-----|------|
| 👑 Owner | Full bot control |
| 🛡 Admin | Moderation commands |
| 👤 User | Standard bot commands |

---

# 🔌 Plugin System

Project Cobra supports **dynamic plugins**, allowing commands to be added **without modifying the core engine**.

All plugins are automatically loaded from the **plugins folder**.

### Example Plugin Commands


.ai
.video
.play
.gif
.weather
.translate
.simplify
.ig
.viewonce
.removebg
.news
.sticker
.autostatus


---

# ⚙️ Commands

## 🧠 Core Commands

| Command | Description |
|--------|-------------|
| `.ping` | Check if bot is alive |
| `.menu` | Display command dashboard |
| `.about` | Bot information |
| `.stats` | Bot analytics |

---

## 🛡 Moderation Commands

| Command | Permission |
|--------|-----------|
| `.kick` | Admin / Owner |
| `.ban` | Owner only |

---

## 🎵 Media & Utility Commands

| Command | Description |
|--------|-------------|
| `.play` | Download music from YouTube |
| `.video` | Download YouTube videos |
| `.gif` | Search GIFs |
| `.weather` | Get weather info |
| `.translate` | Translate text |
| `.simplify` | Simplify long text with language output (EN/TA/HI) |
| `.news` | Get latest top headlines in English or Tamil |
| `.sticker` | Reply to image for sticker or generate AI sticker from prompt |

---

## 🤖 AI & Automation Commands

| Command | Description |
|--------|-------------|
| `.ai` | AI chatbot interaction |
| `.ig` | Download Instagram media |
| `.viewonce` | Reveal view-once media |
| `.removebg` | Remove image background (reply to photo) |
| `.sticker` | Create stickers from replied images or AI text prompts |
| `.autostatus` | Auto-post supported social links to WhatsApp status (ON/OFF/manual) |



## 🔥 AutoStatus Plugin

`autostatus` supports:
- YouTube / YouTube Shorts
- Instagram / Instagram Reels
- Facebook Video / Facebook Reels
- ShareChat
- Moj

### Command Usage
- `.autostatus on`
- `.autostatus off`
- `.autostatus status`
- `.autostatus <link>`

### Persistence
State is stored in:

`database/autostatus.json`

### Auto Trigger Integration (whatsapp.js)
```js
const autoStatusPlugin = require("./plugins/autostatus");

// inside messages.upsert after extracting text
if (!text.startsWith(".")) {
  await autoStatusPlugin.handleAutoStatusMessage(sock, msg, text);
  return;
}
```

### Fallback Order
1. Provider1 - Cobalt API
2. Provider2 - Cobalt mirror
3. Provider3 - yt-dlp universal download
4. Provider4 - yt-dlp metadata direct URL


---

# 🏗 Project Architecture

Project-Cobra
│
├── whatsapp.js
├── commandHandler.js
├── settings.js
│
├── commands
│ ├── ping.js
│ ├── menu.js
│ ├── about.js
│ ├── stats.js
│ ├── ban.js
│ └── kick.js
│
├── plugins
│ ├── ai.js
│ ├── video.js
│ ├── gif.js
│ ├── ig.js
│ ├── play.js
│ ├── weather.js
│ └── viewonce.js
│
├── database
│ └── users.json
│
├── logs
│ └── commands.log
│
└── auth
└── WhatsApp session


---

# 🧠 How Cobra Works

1️⃣ User sends a command in WhatsApp  

2️⃣ Prefix system validates the command  

3️⃣ Command handler dynamically loads the module  

4️⃣ Role permissions are verified  

5️⃣ Plugin executes logic  

6️⃣ Command usage is logged and tracked  

---

# 📱 WhatsApp Bot Demo

### Example Command

<img width="1236" height="860" alt="image" src="https://github.com/user-attachments/assets/38eb14a6-8caf-436c-bb16-e7e42496f1d2" />

.ping


Response:


🐍 Project Cobra is Alive!


### Example Menu


.menu

<img width="913" height="845" alt="image" src="https://github.com/user-attachments/assets/3c28054a-3b8a-4633-9ab2-2049315ae81f" />



Displays the full command dashboard.

---

# ⚡ Installation

### 1️⃣ Clone Repository


git clone https://github.com/aswinhub26/Project-Cobra.git

cd Project-Cobra


### 2️⃣ Install Dependencies


npm install


### 3️⃣ Start the Bot


node whatsapp.js


Scan the **QR code using WhatsApp**.

---

# 📊 Future Improvements

- 🌐 Express REST API integration
- 📊 Advanced analytics dashboard
- 🗄 MongoDB database support
- 🤖 Telegram / Discord integration
- 🧠 Improved AI automation
- ⚡ Distributed bot architecture

---

# 🤝 Contributing

Contributions are welcome!

Steps:

1️⃣ Fork the repository  
2️⃣ Create a new branch  
3️⃣ Submit a Pull Request  

---

# 👨‍💻 Author

**Aswin D**

Project Cobra was built as a **learning project** to explore:

- chatbot frameworks
- automation systems
- scalable backend architectures

It demonstrates how **real bot platforms and automation engines work internally**.

---

⭐ If you like this project, consider **starring the repository**.
