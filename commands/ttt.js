module.exports = {
  name: "ttt",

  execute() {
    const winningLines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6]
    ]

    const board = Array(9).fill("⬜")
    const sequence = ["❌", "⭕", "❌", "⭕", "❌", "⭕", "❌", "⭕", "❌"]

    for (let i = 0; i < 9; i++) board[i] = sequence[i]

    const winLine = winningLines[Math.floor(Math.random() * winningLines.length)]
    const winner = Math.random() > 0.5 ? "❌" : "⭕"
    winLine.forEach(i => {
      board[i] = winner === "❌" ? "🔥" : "🌟"
    })

    return `🎮✨ *TIC TAC TOE ARENA* ✨🎮

🕹️ Loading board...
▰▰▱▱▱ 40%
▰▰▰▰▱ 80%
▰▰▰▰▰ 100% ✅

${board[0]} ${board[1]} ${board[2]}
${board[3]} ${board[4]} ${board[5]}
${board[6]} ${board[7]} ${board[8]}

🏆 Winner: *${winner} Player*
🎉 Combo line activated with ${winner === "❌" ? "fire" : "star"} effects!

💡 Play again: *.ttt*`
  }
}
