module.exports = {
  name: "rps",

  execute(sock, msg, args) {
    const choices = ["rock", "paper", "scissors"]
    const emoji = { rock: "🪨", paper: "📄", scissors: "✂️" }

    const userChoice = (args && args[0] ? args[0].toLowerCase() : "")
    if (!choices.includes(userChoice)) {
      return `🎯 *RPS BATTLE MODE*\n\nUse: *.rps rock* or *.rps paper* or *.rps scissors*\n\n${emoji.rock} Rock smashes Scissors\n${emoji.paper} Paper wraps Rock\n${emoji.scissors} Scissors cut Paper\n\n⚡ Arena effects loaded: neon lights + battle music`
    }

    const botChoice = choices[Math.floor(Math.random() * choices.length)]

    let result = "🤝 It's a draw!"
    if (
      (userChoice === "rock" && botChoice === "scissors") ||
      (userChoice === "paper" && botChoice === "rock") ||
      (userChoice === "scissors" && botChoice === "paper")
    ) {
      result = "🏆 You win!"
    } else if (userChoice !== botChoice) {
      result = "😎 Cobra wins this round!"
    }

    return `⚔️ *ROCK PAPER SCISSORS* ⚔️\n\nYou: ${emoji[userChoice]} *${userChoice}*\nCobra: ${emoji[botChoice]} *${botChoice}*\n\n${result}\n✨ Animation: slash effects + victory sparks\n\n🔁 Rematch: *.rps <rock|paper|scissors>*`
  }
}
