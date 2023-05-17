const { TelegramClient, Api } = require('telegram')
const { StringSession } = require('telegram/sessions')
const { Raw } = require('telegram/events')
const { fuzzy } = require('fast-fuzzy')

const Data = require('./models/dataModel')
const {
  menuBtn,
  fields,
  backBtn,
  groupsBtn,
  wordsBtn,
  groupsSelectBtn,
  backAddBtn,
  categoriesBtn,
} = require('./buttons')
const { MENU, GROUPS, WORDS, CATEGORIES } = require('./commands')
const { myuuid } = require('./utils')

/* =============================================================================
  * MAIN FUNCTION
============================================================================= */
async function main({ bot, client, msg }) {
  const { id } = msg.chat
  let db = await Data.findOne({ id })
  if (!db) db = await Data.create({ id, username: msg.chat.username })

  const { position } = db
  const data = { bot, client, msg, id, db }

  switch (position) {
    case MENU:
      return menuHandler(data)
    case GROUPS:
      return groupsHandler(data)
    case CATEGORIES:
      return categoriesHandler(data)
    case WORDS:
      return wordsHandler(data)
  }
}

/* =============================================================================
  * HANDLERS
============================================================================= */
// * /help or /start
async function helpHandler({ bot, client, msg }) {
  const { id } = msg.chat
  const message = `<i>Разберется любой чел</i>`
  await bot.sendMessage(id, message, { parse_mode: 'HTML' })

  return main({ bot, client, msg })
}

// * POSITION "MENU"
async function menuHandler({ bot, client, msg, id, db }) {
  // * BUTTONS
  const btns = {
    [fields.groupBtnField]: GROUPS,
    [fields.categoryBtnField]: CATEGORIES,
  }

  if (msg.text in btns) {
    db.position = btns[msg.text]
    await db.save()
    return main({ bot, client, msg })
  }

  // * LOGIC
  const { MAX_MENU_LIST_ITEMS } = process.env
  const groupsMsg = db.groups?.length
    ? '\n\n🍟 <b>Группы:</b>\n' +
      db.groups
        .slice(-MAX_MENU_LIST_ITEMS)
        .map(i => `\t\t\t\t\t\t\t<code>${i.name}</code>`)
        .join('\n')
    : ''
  const message = db.groups?.length
    ? `<b>Меню:</b>${groupsMsg}\n\n<i>Отображаются только последние <b>${MAX_MENU_LIST_ITEMS}</b> записей\n(нажмите чтобы скопировать)</i>`
    : ''

  // * RETURN
  if (message) await bot.sendMessage(id, message, { parse_mode: 'HTML' })
  return bot.sendMessage(id, `💩`, { parse_mode: 'HTML', ...menuBtn })
}

// * POSITION "GROUPS"
async function groupsHandler({ bot, client, msg, id, db }) {
  // * BUTTONS
  if (msg.text === fields.backBtnField) {
    db.position = MENU
    await db.save()

    msg.text = ''
    return main({ bot, client, msg })
  }

  // * LOGIC
  let text = msg.text?.trim()
  // if (text.startsWith('https://t.me/')) text = text.replace('https://t.me/', '')
  if (/^https:\/\/t.me\/[a-zA-Z0-9]*$/.test(text))
    text = text.replace('https://t.me/', '')
  if (text?.length > 3 && text !== fields.groupBtnField) {
    try {
      // ? проверка, есть ли это значение в массиве
      const includeName = db.groups.some(
        i => i.name.toLowerCase() === text.toLowerCase()
      )
      if (includeName) {
        await bot.sendMessage(id, `<i>Группа уже добавлена.</i>`, {
          parse_mode: 'HTML',
          reply_to_message_id: msg.message_id,
        })

        msg.text = ''
        return groupsHandler({ bot, client, msg, id, db })
      }

      let groups = await client.invoke(
        new Api.contacts.Search({
          q: text,
          limit: 5000,
        })
      )

      groups = groups?.chats?.filter(
        i => i?.title === text || i?.username === text
      )
      if (!groups.length) {
        await bot.sendMessage(id, `<i>Группа не найдена</i>`, {
          parse_mode: 'HTML',
          reply_to_message_id: msg.message_id,
        })

        msg.text = ''
        return groupsHandler({ bot, client, msg, id, db })
      }

      if (groups.length > 1) {
        return bot.sendMessage(
          id,
          `<i>Найдено несколько групп с таким названием.\n<b>Требуется уточнение:</b></i>`,
          {
            parse_mode: 'HTML',
            reply_to_message_id: msg.message_id,
            ...groupsSelectBtn(groups),
          }
        )
      }

      const group = {
        id: groups[0].id?.valueOf(),
        name: groups[0]?.title,
        // username: res[0]?.username,
      }

      try {
        await client.invoke(
          new Api.channels.JoinChannel({
            channel: text,
          })
        )
      } catch (e) {
        console.log(e?.message?.red)
        await bot.sendMessage(
          id,
          `<b>Возникла ошибка при присоединении клиента к каналу/группе</b>\n\n<code>${e?.message}</code>\n\n#error #clienterror`,
          { parse_mode: 'HTML' }
        )
      }

      if (!group.id || !group.name) throw new Error('Не найдены нужные поля')

      db.groups.push(group)
      await db.save()

      msg.text = ''
      return groupsHandler({ bot, client, msg, id, db })
    } catch (e) {
      console.log(
        '🚀 ~ file: logic.js ~ line 169 ~ groupsHandler ~ e'.red,
        e?.message?.red
      )
      await bot.sendMessage(
        id,
        `<b>Что-то не так.</b>\n\n<code>${e?.message}</code>\n\n#error`,
        { parse_mode: 'HTML' }
      )

      msg.text = ''
      return groupsHandler({ bot, client, msg, id, db })
    }
  }

  // * RETURN
  await bot.sendMessage(id, `🍟`, {
    parse_mode: 'HTML',
    ...backBtn,
  })

  return bot.sendMessage(id, `<i>(нажми чтобы удалить)</i>`, {
    parse_mode: 'HTML',
    ...groupsBtn(db.groups),
  })
}

// * POSITION "CATEGORIES"
async function categoriesHandler({ bot, client, msg, id, db }) {
  // * BUTTONS
  if (msg.text === fields.backBtnField) {
    db.position = MENU
    await db.save()

    msg.text = ''
    return main({ bot, client, msg })
  }
  // * BUTTONS
  const btns = {
    [fields.backBtnField]: MENU,
    // [fields.addCategoryBtnField]: ADD_CATEGORY,
  }

  if (msg.text in btns) {
    db.position = btns[msg.text]
    await db.save()
    return main({ bot, client, msg })
  }

  // * LOGIC
  const text = msg.text?.trim()
  if (text.length >= 3 && text !== fields.categoryBtnField) {
    const [name, groupReport] = text.split(' - ')
    const newCategory = {
      id: myuuid(),
      // name: text,
      // groupReport: -1702044775,
      name,
      groupReport,
      words: [],
    }
    db.categories.push(newCategory)
    await db.save()

    msg.text = ''
    return categoriesHandler({ bot, client, msg, id, db })
  }

  // * RETURN
  await bot.sendMessage(id, `🍱`, {
    parse_mode: 'HTML',
    ...backAddBtn,
  })

  if (db.categories?.length) {
    const message = `<i>чтобы добавить категорию: напишите в чат сообщение в формате: </i>\n\n\t\t\t<code>КАТЕГОРИЯ - НАЗВАНИЕ ГРУППЫ</code>`
    return bot.sendMessage(id, message, {
      parse_mode: 'HTML',
      ...categoriesBtn(db.categories),
    })
  } else {
    return bot.sendMessage(
      id,
      `<b>У вас нет ни одной категории</b>\n<i>Для начала нажмите кнопку ${fields.addCategoryBtnField} и следуйте инструкциям на экране.</i>`,
      { parse_mode: 'HTML' }
    )
  }
}

// * POSITION "WORDS"
async function wordsHandler({ bot, client, msg, id, db }) {
  // * BUTTONS
  if (msg.text === fields.backBtnField) {
    db.position = CATEGORIES
    db.category = ''
    await db.save()

    msg.text = ''
    return main({ bot, client, msg })
  }

  // * LOGIC
  const text = msg.text?.trim()
  if (text?.length >= 2 && text !== fields.wordBtnField) {
    const ctg = db.categories.find(i => i.id === db.category)
    if (ctg.words.includes(text)) {
      await bot.sendMessage(id, `<i>Уже отслеживается.</i>`, {
        parse_mode: 'HTML',
        reply_to_message_id: msg.message_id,
      })

      msg.text = ''
      return wordsHandler({ bot, client, msg, id, db })
    }

    ctg.words.push(text)
    db.categories = db.categories.map(i => {
      if (i.id !== ctg.id) return i
      return ctg
    })
    await db.save()

    msg.text = ''
    return wordsHandler({ bot, client, msg, id, db })
  }

  // * RETURN
  await bot.sendMessage(id, `🍕`, {
    parse_mode: 'HTML',
    ...backBtn,
  })

  const tcat = db.categories.find(i => i.id === db.category)
  return bot.sendMessage(
    id,
    `<b>Категория: ${tcat.name}</b>\n<i>(нажми чтобы удалить)</i>`,
    { parse_mode: 'HTML', ...wordsBtn(db.category, tcat.words) }
  )
}

// * on button query "SELECT_GROUP_:ID"
async function selectGroupHandler({ bot, client, q }) {
  const msg = q.message
  const { id } = msg.chat

  const groupId = q.data.split('_').at(-1)
  const groupName = msg.reply_to_message.text

  const field = { id: groupId, name: groupName }

  // TODO: переделать на 1 обращение
  const db = await Data.findOne({ id })
  db.groups.push(field)
  await db.save()

  await bot.editMessageReplyMarkup(
    { inline_keyboard: [] },
    {
      chat_id: id,
      message_id: msg.message_id,
    }
  )
  return groupsHandler({ bot, client, msg, id, db })
}

// * on button query "DEL_GROUP_:ID"
async function deleteGroupHandler({ bot, client, q }) {
  let msg = q.message
  const { id } = msg.chat

  // * LOGIC
  const db = await Data.findOne({ id })
  if (!db || db.position !== GROUPS) {
    await bot.editMessageReplyMarkup(
      { inline_keyboard: [] },
      {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
      }
    )

    msg.text = ''
    return main({ bot, client, msg })
  }

  try {
    const delId = +q.data.split('_').at(-1)
    const channel = db.groups.find(i => i.id === delId).name

    // ? проверка нет ли других пользователей, отслеживающих эту группу
    const otherUsersWithGroup = await Data.find({
      id: { $ne: id },
      groups: {
        $exists: true,
        $type: 'array',
        $ne: [],
        $elemMatch: { id: delId },
      },
    })

    if (!otherUsersWithGroup.length) {
      try {
        await client.invoke(new Api.channels.LeaveChannel({ channel }))
      } catch (e) {
        console.log(e?.message?.red)
        await bot.sendMessage(
          id,
          `<b>Возникла ошибка при выходе из группы/канала/супергруппы/суперканала</b>\n<i>Обычно такое происходит только если скрипт был перезапущен</i>\n\n<i>➡️ Зайди и выйди обрато:\n\n<code>${channel}</code>\n\nили, если не впадлу, выйди из группы вручную</i>\n\n<code>${e?.message}</code>\n\n#error #clienterror`,
          { parse_mode: 'HTML' }
        )
      }
    }

    db.groups = db.groups.filter(i => i.id !== delId)
    await db.save()

    return await bot.editMessageReplyMarkup(groupsBtn(db.groups).reply_markup, {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
    })
  } catch (e) {
    console.log(e?.message?.red)
    msg.text = ''
    // return deleteGroupHandler({ bot, client, q })
    return groupsHandler({ bot, client, msg, id, db })
  }
}

// * on button query "SELECT_CATEGORY_:ID"
async function selectCategoryHandler({ bot, client, q }) {
  let msg = q.message
  const { id } = msg.chat

  // * LOGIC
  const db = await Data.findOne({ id })
  if (!db || db.position !== CATEGORIES) {
    await bot.editMessageReplyMarkup(
      { inline_keyboard: [] },
      {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
      }
    )

    msg.text = ''
    return main({ bot, client, msg })
  }

  try {
    const selectCategory = q.data.split('_')[2]
    db.category = selectCategory
    db.position = WORDS
    await db.save()

    msg.text = ''
    // return main({ bot, client, msg })
    return wordsHandler({ bot, client, msg, id, db })
  } catch (e) {
    msg.text = ''
    // return deleteCategoryHandler({ bot, client, q })
    return categoriesHandler({ bot, client, msg, id, db })
  }
}

// * on button query "DEL_CATEGORY_:ID"
async function deleteCategoryHandler({ bot, client, q }) {
  let msg = q.message
  const { id } = msg.chat

  // * LOGIC
  const db = await Data.findOne({ id })
  if (!db || db.position !== CATEGORIES) {
    await bot.editMessageReplyMarkup(
      { inline_keyboard: [] },
      {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
      }
    )

    msg.text = ''
    return main({ bot, client, msg })
  }

  try {
    const delCategory = q.data.split('_')[2]
    db.categories = db.categories.filter(i => i.id !== delCategory)
    await db.save()

    return await bot.editMessageReplyMarkup(
      categoriesBtn(db.categories).reply_markup,
      {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
      }
    )
  } catch (e) {
    msg.text = ''
    // return deleteCategoryHandler({ bot, client, q })
    return categoriesHandler({ bot, client, msg, id, db })
  }
}

// * on button query "DEL_WORD_:WORD"
async function deleteWordHandler({ bot, client, q }) {
  let msg = q.message
  const { id } = msg.chat
  // const ctg = q.data.split('_')[2]
  // const delWord = q.data.split('_').slice(3).join('_')
  const [ctg, delWordIdx] = q.data.split('_').slice(2)

  // * LOGIC
  const db = await Data.findOne({ id })
  if (!db || db.position !== WORDS || db.category !== ctg) {
    await bot.editMessageReplyMarkup(
      { inline_keyboard: [] },
      {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
      }
    )

    msg.text = ''
    return main({ bot, client, msg })
  }

  try {
    // db.words = db.words.filter(i => i !== delWord)
    // db.categories = db.categories.map(i => {
    //   if (i.id !== ctg) return i
    //   return {
    //     ...i,
    //     words: i.words.filter(i => i !== delWord),
    //   }
    // })
    db.categories = db.categories.map(i => {
      if (i.id !== ctg) return i
      return {
        ...i,
        words: i.words.filter((_, idx) => idx !== +delWordIdx),
      }
    })
    await db.save()

    return await bot.editMessageReplyMarkup(
      wordsBtn(ctg, db.categories.find(i => i.id === ctg).words).reply_markup,
      {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
      }
    )
  } catch (e) {
    console.log(e?.message?.red)
    msg.text = ''
    return wordsHandler({ bot, client, msg, id, db })
  }
}

/* =============================================================================
  * TELEGRAM APPLICATION FUNCTIONS
============================================================================= */
// * CREATE CONNECTION CLIENT
async function createClient() {
  const { API_ID, API_HASH, SESSION } = process.env

  const strSession = new StringSession(SESSION)
  // const strSession = new StringSession()

  const opts = {
    // connectionRetries: 5,
  }

  const client = new TelegramClient(strSession, +API_ID, API_HASH, opts)

  // ? LOGIN and GET SESSION
  // const input = require('input')
  // await client.start({
  //   phoneNumber: async () => await input.text('number ?'),
  //   password: async () => await input.text('password?'),
  //   phoneCode: async () => await input.text('Code ?'),
  //   onError: err => console.log(err),
  // })
  // console.log(client.session.save()) // Save this string to avoid logging in again

  return client
}

// * EVENT HANDLER
async function createEventHandler({ bot, client }) {
  client.addEventHandler(async e => {
    // * FILTER EVENTS
    const events = ['UpdateNewChannelMessage', 'UpdateEditChannelMessage']
    if (!events.includes(e.className)) return

    const { FORWARD_MSG_TO_PEAR, MATCH_RATIO } = process.env
    const msg = e.message
    const groupId = e.message?.peerId?.channelId?.valueOf()

    // * GET DATA FROM DATABASE
    const users = await Data.find({
      groups: {
        $exists: true,
        $type: 'array',
        $ne: [],
        $elemMatch: { id: groupId },
      },
      categories: { $exists: true, $type: 'array', $ne: [] },
    }).select('id categories groups -_id')
    if (!users.length) return

    // * перебираем всех пользователей
    for (let user of users) {
      // const allWords = user.categories.reduce(
      //   (arr, cur) => arr.push(...cur.words) && arr,
      //   []
      // )
      // console.log(allWords)
      for (let category of user.categories) {
        const fuzzyArr = category.words.map(word =>
          fuzzy(word, msg.message, {
            ignoreCase: true,
            normalizeWhitespace: true,
          })
        )
        if (!fuzzyArr.some(i => i >= MATCH_RATIO)) continue

        // * SEND RESULT TO PEAR
        try {
          const message = `<b>Степень совпадения:</b>\n${category.words
            .map(
              (word, idx) =>
                `▫️ ${word} - ${(+fuzzyArr[idx] * 100).toFixed(1)}%`
            )
            .join('\n')}\n\n⬇️⬇️⬇️⬇️⬇️`

          // ? обязательно сделать поиск, т.к. иначе не отправит сообщения
          let groups = await client.invoke(
            new Api.contacts.Search({
              q: category.groupReport,
              limit: 500,
            })
          )
          // console.log(groups)

          await client.sendMessage(category.groupReport, {
            message,
            parseMode: 'html',
          })
          await client.invoke(
            new Api.messages.ForwardMessages({
              fromPeer: groupId,
              id: [msg.id],
              randomId: [BigInt(Math.floor(Math.random() * -10000000000000))],
              toPeer: category.groupReport,
            })
          )
        } catch (e) {
          console.log(e?.message?.red)
        }
      }
    }

    // ! OLD
    // const groupsId = db.groups.map(i => +i.id)
    // if (!groupsId.includes(groupId)) return

    // * CHECKING IF THE DESIRED SUBSTRING IS FOUND IN THE MESSAGE
    // const fuzzyArr = db.words.map(word => fuzzy(word, msg.message))
    // console.log(fuzzyArr)
    // if (!fuzzyArr.some(i => i >= MATCH_RATIO)) return

    // // * SEND RESULT TO PEAR
    // try {
    //   await client.sendMessage(FORWARD_MSG_TO_PEAR, {
    //     message: `<b>Степень совпадения:</b>\n${db.words
    //       .map(
    //         (word, idx) => `▫️ ${word} - ${(+fuzzyArr[idx] * 100).toFixed(1)}%`
    //       )
    //       .join('\n')}\n\n⬇️⬇️⬇️⬇️⬇️`,
    //     parseMode: 'html',
    //   })
    //   await client.invoke(
    //     new Api.messages.ForwardMessages({
    //       fromPeer: groupId,
    //       id: [msg.id],
    //       randomId: [BigInt(Math.floor(Math.random() * -10000000000000))],
    //       toPeer: FORWARD_MSG_TO_PEAR,
    //     })
    //   )
    // } catch (e) {
    //   console.log(e?.message?.red)
    // }
  }, new Raw({}))
}

/* =============================================================================
  * EXPORTS
============================================================================= */
module.exports = {
  main,
  helpHandler,
  menuHandler,

  selectGroupHandler,
  selectCategoryHandler,

  deleteGroupHandler,
  deleteCategoryHandler,
  deleteWordHandler,

  createClient,
  createEventHandler,
}
