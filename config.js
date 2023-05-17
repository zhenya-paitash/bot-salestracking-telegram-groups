const mongoose = require('mongoose')
const { HELP } = require('./commands')

// =============================================================================
const connectDB = async () => {
  try {
    const connect = await mongoose.connect(process.env.MONGO_URI, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
    })
    console.log(`Mongodb connected: ${connect.connection.host}`.cyan.underline)
  } catch (e) {
    console.error(`MongodbError: ${e.message}`.red.underline.bold)
  }
}

// =============================================================================
const botConfig = async bot => {
  return await bot.setMyCommands([{ command: HELP, description: '🏳️ Помощь' }])
}

// =============================================================================
module.exports = { connectDB, botConfig }
