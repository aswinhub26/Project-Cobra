const quizBank = [
  {
    id: 1,
    question: "Which is the capital of India?",
    options: ["A) Mumbai", "B) New Delhi", "C) Chennai", "D) Kolkata"],
    answer: "b",
    explain: "New Delhi is the capital city of India 🇮🇳"
  },
  {
    id: 2,
    question: "Which planet is known as the Red Planet?",
    options: ["A) Venus", "B) Jupiter", "C) Mars", "D) Saturn"],
    answer: "c",
    explain: "Mars is called the Red Planet because of iron oxide on its surface 🔴"
  },
  {
    id: 3,
    question: "Which ocean is the largest on Earth?",
    options: ["A) Atlantic Ocean", "B) Indian Ocean", "C) Arctic Ocean", "D) Pacific Ocean"],
    answer: "d",
    explain: "The Pacific Ocean is the largest ocean on Earth 🌊"
  },
  {
    id: 4,
    question: "Who is known as the Father of Computers?",
    options: ["A) Alan Turing", "B) Charles Babbage", "C) Bill Gates", "D) Tim Berners-Lee"],
    answer: "b",
    explain: "Charles Babbage is known as the Father of Computers 💻"
  }
]

module.exports = {
  name: "quiz",

  execute(sock, msg, args) {
    const idArg = Number((args && args[0]) || 0)
    const choiceArg = ((args && args[1]) || "").toLowerCase()

    if (idArg && choiceArg) {
      const selected = quizBank.find(q => q.id === idArg)
      if (!selected) return "❌ Invalid quiz id. Use *.quiz* to get a new question."

      const ok = selected.answer === choiceArg
      return `🧠 *QUIZ RESULT*\n\n📌 Q${selected.id}: ${selected.question}\n🎯 Your Answer: *${choiceArg.toUpperCase()}*\n✅ Correct Answer: *${selected.answer.toUpperCase()}*\n\n${ok ? "🏆 Correct! Brilliant move! 🎉" : "😵 Oops! Not correct this time."}\n💡 ${selected.explain}\n\n🔁 Next round: *.quiz*`
    }

    const q = quizBank[Math.floor(Math.random() * quizBank.length)]

    return `🌈🧠 *MEGA QUIZ CHALLENGE* 🧠🌈\n\n✨ Question ID: *${q.id}*\n❓ ${q.question}\n\n${q.options.map(o => `• ${o}`).join("\n")}\n\n⏱️ Timer: 15s (virtual)\n🎬 FX: confetti + drum roll + spotlight ✨\n\n👉 Answer format: *.quiz ${q.id} <option>*\nExample: *.quiz ${q.id} ${q.answer}*`
  }
}
