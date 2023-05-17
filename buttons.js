/* =============================================================================
  * CONFIG
============================================================================= */
const config = {
  resize_keyboard: true,
  one_time_keyboard: false,
}

const fields = {
  groupBtnField: '🍟 Группы',
  wordBtnField: '🍕 Слова',
  categoryBtnField: '🍱 Категории',
  addCategoryBtnField: '➕ Добавить',
  delCategoryBtnField: '⬅️ Удалить',
  backBtnField: '🔙 Назад',
}

function toRows(arr, row) {
  const keyboard = []
  for (let i = 0; i < Math.ceil(arr.length / 2); i++)
    keyboard.push(arr.slice(i * row, (i + 1) * row))

  return keyboard
}

/* =============================================================================
  * BUTTONS
============================================================================= */
const menuBtn = {
  reply_markup: {
    keyboard: [[fields.groupBtnField, fields.categoryBtnField]],
    input_field_placeholder: 'menu',
    ...config,
  },
}

const backBtn = {
  reply_markup: {
    keyboard: [[fields.backBtnField]],
    input_field_placeholder: 'menu',
    ...config,
  },
}

const backAddBtn = {
  reply_markup: {
    // keyboard: [[fields.addCategoryBtnField], [fields.backBtnField]],
    keyboard: [[fields.backBtnField]],
    input_field_placeholder: 'menu',
    ...config,
  },
}

/* =============================================================================
  * FUNCTION BUTTONS
============================================================================= */
const groupsBtn = groups => {
  let inline_keyboard = []
  if (groups.length) {
    inline_keyboard = toRows(
      groups.map(i => ({ text: i.name, callback_data: `del_group_${i.id}` })),
      2
    )
  }

  return {
    reply_markup: {
      inline_keyboard,
      ...config,
    },
  }
}

const groupsSelectBtn = groups => {
  const inline_keyboard = groups.map(i => [
    {
      text: i.username,
      callback_data: `select_group_${i.id.valueOf()}`,
    },
  ])

  return {
    reply_markup: {
      inline_keyboard,
      ...config,
    },
  }
}

const categoriesBtn = categories => {
  let inline_keyboard = []
  if (categories.length) {
    // inline_keyboard = toRows(
    //   categories.map(i => ({
    //     text: i.name,
    //     callback_data: `select_category_${i.id}`,
    //   })),
    //   2
    // )
    inline_keyboard = categories.map(i => {
      return [
        {
          text: i.name,
          callback_data: `select_category_${i.id}`,
        },
        {
          text: fields.delCategoryBtnField,
          callback_data: `del_category_${i.id}`,
        },
      ]
    })
  }

  return {
    reply_markup: {
      inline_keyboard,
      ...config,
    },
  }
}

const wordsBtn = (category, words) => {
  let inline_keyboard = []
  if (words.length) {
    inline_keyboard = toRows(
      words
        // .slice(0, 14)
        .map((i, idx) => ({
          text: i,
          callback_data: `del_word_${category}_${idx}`,
        })),
      2
    )

    // const { MAX_BTN_LIST_ITEMS } = process.env
    // if (words.length > MAX_BTN_LIST_ITEMS)
    //   inline_keyboard.push(pagination(1, Math.ceil(words / MAX_BTN_LIST_ITEMS)))
  }

  return {
    reply_markup: {
      inline_keyboard,
      ...config,
    },
  }
}

// const pagination = (current, pages) => {
//   const paginationBtn = []
//   if (pages > 1) {
//   }

//   return paginationBtn
// }

/* =============================================================================
  * EXPORTS
============================================================================= */
module.exports = {
  fields,
  menuBtn,
  backBtn,
  backAddBtn,
  groupsBtn,
  groupsSelectBtn,
  categoriesBtn,
  wordsBtn,
}
