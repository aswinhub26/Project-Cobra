const fs = require("fs")
const path = require("path")

const DB_PATH = path.join(__dirname, "..", "database", "ttt.json")

function ensureDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ sessions: {} }, null, 2))
  }
}

function loadDb() {
  ensureDb()
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"))
}

function saveDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
}

function checkWinner(board, mark) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ]

  return lines.some(([a, b, c]) => board[a] === mark && board[b] === mark && board[c] === mark)
}

function availableMoves(board) {
  return board.map((cell, i) => (cell ? null : i)).filter(i => i !== null)
}

function findWinningMove(board, mark) {
  const moves = availableMoves(board)
  for (const move of moves) {
    const copy = [...board]
    copy[move] = mark
    if (checkWinner(copy, mark)) return move
  }
  return null
}

function getBotMove(board) {
  const win = findWinningMove(board, "O")
  if (win !== null) return win

  const block = findWinningMove(board, "X")
  if (block !== null) return block

  if (!board[4]) return 4

  const corners = [0, 2, 6, 8].filter(i => !board[i])
  if (corners.length) return corners[Math.floor(Math.random() * corners.length)]

  const moves = availableMoves(board)
  return moves[Math.floor(Math.random() * moves.length)]
}

function renderBoard(board) {
  const numberEmoji = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"]
  const show = board.map((cell, i) => {
    if (cell === "X") return "❌"
    if (cell === "O") return "⭕"
    return numberEmoji[i]
  })

  return `${show[0]} ${show[1]} ${show[2]}\n${show[3]} ${show[4]} ${show[5]}\n${show[6]} ${show[7]} ${show[8]}`
}

module.exports = {
  name: "ttt",

  execute(sock, msg, args, user) {
    const player = user?.name || "player"
    const db = loadDb()
    const sessions = db.sessions || {}

    const input = (args && args[0] ? String(args[0]).toLowerCase() : "").trim()

    if (!input || ["start", "new", "play"].includes(input)) {
      sessions[player] = { board: Array(9).fill("") }
      db.sessions = sessions
      saveDb(db)

      return `🎮✨ *TIC TAC TOE - YOU vs COBRA BOT* ✨🎮\n\n🧠 You are *❌* and Cobra is *⭕*\n📦 Pick a box by number: *.ttt 1* to *.ttt 9*\n\n${renderBoard(sessions[player].board)}\n\n🔥 Your move first! Don't panic brooo 😎`
    }

    if (input === "help") {
      return "🆘 *TTT HELP*\n• Start game: *.ttt*\n• Play move: *.ttt 3*\n• Reset game: *.ttt new*\n\n💡 Fill 3 in a row before Cobra does."
    }

    const cell = Number(input)
    if (!Number.isInteger(cell) || cell < 1 || cell > 9) {
      return "❌ Invalid move. Use numbers *1 to 9* like: *.ttt 3*"
    }

    const session = sessions[player]
    if (!session || !Array.isArray(session.board)) {
      return "🎲 No active game found. Start one with *.ttt*"
    }

    const idx = cell - 1
    if (session.board[idx]) {
      return `🚫 Box ${cell} already taken bro! Try another one 😜\n\n${renderBoard(session.board)}`
    }

    session.board[idx] = "X"

    if (checkWinner(session.board, "X")) {
      delete sessions[player]
      db.sessions = sessions
      saveDb(db)
      return `🏆 *YOU WIN!*\n\n${renderBoard(session.board)}\n\n😳 Cobra got cooked... GG legend!`
    }

    if (availableMoves(session.board).length === 0) {
      delete sessions[player]
      db.sessions = sessions
      saveDb(db)
      return `🤝 *DRAW MATCH*\n\n${renderBoard(session.board)}\n\nBoth brains too powerful 🧠⚡`
    }

    const botMove = getBotMove(session.board)
    session.board[botMove] = "O"

    if (checkWinner(session.board, "O")) {
      delete sessions[player]
      db.sessions = sessions
      saveDb(db)
      return `💀 *COBRA WINS!*\n\n${renderBoard(session.board)}\n\n😂 Haha better luck brooo! You played well though 💪\n🌟 Come back stronger: *.ttt*`
    }

    if (availableMoves(session.board).length === 0) {
      delete sessions[player]
      db.sessions = sessions
      saveDb(db)
      return `🤝 *DRAW MATCH*\n\n${renderBoard(session.board)}\n\nNo winner, only suspense 🎬`
    }

    db.sessions = sessions
    saveDb(db)

    return `⚔️ Your move: *${cell}*\n🤖 Cobra played: *${botMove + 1}*\n\n${renderBoard(session.board)}\n\n👉 Next move: *.ttt <1-9>*`
  }
}
