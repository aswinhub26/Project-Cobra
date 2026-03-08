const axios = require("axios")

module.exports = {
    name: "weather",

    async execute(user, city) {

        if (!city) {
            return "❌ Usage: .weather city"
        }

        try {

            const res = await axios.get(
                `https://wttr.in/${city}?format=j1`
            )

            const weather = res.data.current_condition[0]

            return `🌤 Weather in ${city}

Temperature: ${weather.temp_C}°C
Condition: ${weather.weatherDesc[0].value}
Humidity: ${weather.humidity}%`
        }

        catch {

            return "⚠ Weather error"
        }
    }
}
