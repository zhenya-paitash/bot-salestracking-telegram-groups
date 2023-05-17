require('colors')
const { config } = require('dotenv')
const TelegramBot = require('node-telegram-bot-api')

const { connectDB, botConfig } = require('./config')
const { START, HELP } = require('./commands')
const {
  main,
  helpHandler,
  createClient,
  createEventHandler,
  deleteGroupHandler,
  deleteWordHandler,
  selectGroupHandler,
  selectCategoryHandler,
  deleteCategoryHandler,
} = require('./logic')

config({ path: './.env' })

//
;(async () => {
  // * CREATE BOT
  const bot = new TelegramBot(process.env.TOKEN_BOT, { polling: true })

  // * CONFIG and CONNECT DB
  await botConfig(bot)
  await connectDB()

  // * CREATE APPLICATION CLIENT
  const client = await createClient()
  await client.connect()

  // * BOT on MESSAGE
  bot.on('message', async msg => {
    switch (msg.text) {
      case START:
      case HELP:
        return helpHandler({ bot, msg })
      default:
        return main({ bot, client, msg })
    }
  })

  // * BOT on QUERY
  bot.on('callback_query', async q => {
    const data = { bot, client, q }

    if (q.data.startsWith('del_group_')) return deleteGroupHandler(data)
    if (q.data.startsWith('select_group_')) return selectGroupHandler(data)
    if (q.data.startsWith('del_word_')) return deleteWordHandler(data)

    if (q.data.startsWith('select_category_'))
      return selectCategoryHandler(data)
    if (q.data.startsWith('del_category_')) return deleteCategoryHandler(data)
  })

  await client.sendMessage('me', {
    message: `🟢 <b>Запуск скрипта: </b> <code>${new Date().toLocaleTimeString()}</code>`,
    parseMode: 'html',
  })

  // * EVENT LISTENER
  await createEventHandler({ bot, client })
})()
