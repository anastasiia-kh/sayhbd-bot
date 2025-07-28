const { Scenes, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const getUserFilePath = (userId) => path.join(dataDir, `${userId}.json`);

function loadUserReminders(userId) {
  try {
    const filePath = getUserFilePath(userId);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading reminders for user', userId, e);
  }
  return [];
}

function saveUserReminders(userId, data) {
  try {
    fs.writeFileSync(getUserFilePath(userId), JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error saving reminders for user', userId, e);
  }
}

const reminderOptions = [
  { label: 'У день події', value: 0 },
  { label: 'За 1 день', value: 1 },
  { label: 'За 3 дні', value: 3 },
  { label: 'За 7 днів', value: 7 }
];

const editReminder = new Scenes.BaseScene('editReminder');

// Універсальна функція для обробки скасування дії
async function handleCancel(ctx) {
  await ctx.reply(
    '❌ Дія скасована. Немає про що турбуватись.',
    Markup.keyboard(['↩️ Повернутись в меню редагування', '🏠 Головне меню']).resize()
  );
  ctx.scene.state.editStep = 'afterEdit'; // Переходимо в стан після редагування
}

editReminder.enter(async (ctx) => {
  const reminders = ctx.scene.state.allReminders || loadUserReminders(ctx.from.id);
  const editId = ctx.scene.state.editId;
  const reminder = reminders.find(r => r.id === editId);

  if (!reminder) {
    await ctx.reply('⚠️ Не вдалося знайти нагадування.');
    return ctx.scene.leave();
  }

  ctx.scene.state.reminder = { ...reminder };
  ctx.scene.state.selectedRemindBefore = new Set(reminder.remindBefore || []);
  ctx.scene.state.editStep = 'menu';
  ctx.scene.state.remindersList = reminders;

  await showMainMenu(ctx);
});

editReminder.on('text', async (ctx) => {
  const step = ctx.scene.state.editStep;
  const text = ctx.message.text;

  // Обробка скасування в будь-який момент
  if (text === '❌ Скасувати' || text === '/cancel') {
    return handleCancel(ctx);
  }

  if (step === 'menu') {
    if (text === '🗓 Змінити дату') {
      ctx.scene.state.editStep = 'editDate';
      await ctx.reply(
        'Введи нову дату у форматі: 25.07.1996 або 1/1/95\nАбо /cancel для скасування',
        Markup.keyboard(['❌ Скасувати', '↩️ Повернутись в меню редагування']).resize()
      );
      return;
    }

    if (text === '📝 Змінити нотатку') {
      ctx.scene.state.editStep = 'editNote';
      await ctx.reply(
        'Введи нову нотатку або /cancel для скасування',
        Markup.keyboard(['❌ Скасувати', '↩️ Повернутись в меню редагування']).resize()
      );
      return;
    }

    if (text === '⏰ Змінити час сповіщень') {
      ctx.scene.state.editStep = 'editRemindBefore';
      await ctx.reply('Вибери, коли надіслати нагадування (натискай кнопки):');
      await showRemindBeforeButtons(ctx);
      return;
    }

    if (text === '❌ Вийти без збереження') {
      await ctx.reply('Редагування скасовано.', Markup.removeKeyboard());
      return ctx.scene.leave();
    }

    await ctx.reply('⚠️ Обери дію з меню.');
    return;
  }

  if (step === 'editDate') {
    const dateRegex = /^\d{1,2}[./\-\s]\d{1,2}[./\-\s]\d{2,4}$/;
    if (!dateRegex.test(text)) {
      await ctx.reply('❌ Невірна дата. Спробуй ще раз або /cancel.');
      return;
    }

    const [day, month, yearPart] = text.split(/[./\-\s]/);
    let yearNum = Number(yearPart);
    const currentYear = new Date().getFullYear() % 100;
    const century = yearNum > currentYear ? 1900 : 2000;
    if (yearPart.length === 2) yearNum += century;

    ctx.scene.state.reminder.date = text;
    ctx.scene.state.editStep = 'afterEdit';
    ctx.scene.state.reminder.dateEdited = true;

    await ctx.reply(
      `Дата змінена на: ${text}`,
      Markup.keyboard(['↩️ Повернутись в меню редагування', '🏠 Головне меню']).resize()
    );
    return;
  }

  if (step === 'editNote') {
    ctx.scene.state.reminder.note = text || '';
    ctx.scene.state.editStep = 'afterEdit';
    ctx.scene.state.reminder.noteEdited = true;

    await ctx.reply(
      `Нотатку змінено на: ${ctx.scene.state.reminder.note || '(порожня)'}`,
      Markup.keyboard(['↩️ Повернутись в меню редагування', '🏠 Головне меню']).resize()
    );
    return;
  }

  if (step === 'afterEdit') {
    if (text === '↩️ Повернутись в меню редагування') {
      ctx.scene.state.editStep = 'menu';
      await showMainMenu(ctx);
      return;
    } else if (text === '🏠 Головне меню') {
      await saveChanges(ctx);
      ctx.scene.state.editStep = 'menu';
      await showMainMenu(ctx);
      return;
    } else {
      await ctx.reply('⚠️ Використовуй кнопки меню.');
      return;
    }
  }
});

editReminder.on('callback_query', async (ctx) => {
  if (ctx.scene.state.editStep !== 'editRemindBefore') return;

  const data = ctx.callbackQuery.data;
  const selected = ctx.scene.state.selectedRemindBefore;

  if (data === 'skip_remind') {
    selected.clear();
    await ctx.answerCbQuery('Нагадування пропущено');
    await ctx.reply(
      'Нагадування пропущено.',
      Markup.keyboard(['↩️ Повернутись в меню редагування', '🏠 Головне меню']).resize()
    );
    ctx.scene.state.editStep = 'afterEdit';
    return;
  }

  if (data.startsWith('toggle_')) {
    const day = Number(data.split('_')[1]);
    if (selected.has(day)) selected.delete(day);
    else selected.add(day);

    await ctx.answerCbQuery();
    await showRemindBeforeButtons(ctx);
    return;
  }

  if (data === 'save_edit') {
    ctx.scene.state.reminder.remindBefore = Array.from(selected).sort((a, b) => a - b);
    ctx.scene.state.remindBeforeEdited = true;
    ctx.scene.state.editStep = 'afterEdit';
    await ctx.answerCbQuery('Нагадування оновлено.');
    await ctx.reply(
      'Нагадування оновлено.',
      Markup.keyboard(['↩️ Повернутись в меню редагування', '🏠 Головне меню']).resize()
    );
    return;
  }

  if (data === 'cancel_edit') {
    ctx.scene.state.editStep = 'menu';
    await ctx.answerCbQuery('Редагування скасовано.');
    await showMainMenu(ctx);
    return;
  }
});

async function showMainMenu(ctx) {
  const reminder = ctx.scene.state.reminder;
  const buttons = [
    `🗓 Змінити дату${reminder.dateEdited ? ' ✔️' : ''}`,
    `📝 Змінити нотатку${reminder.noteEdited ? ' ✔️' : ''}`,
    `⏰ Змінити час сповіщень${reminder.remindBeforeEdited ? ' ✔️' : ''}`,
    '❌ Вийти без збереження',
  ];

  await ctx.reply(
    `Редагуємо нагадування:\n📅 ${reminder.date}${reminder.note ? ` — ${reminder.note}` : ''}\n\nЩо хочеш змінити?`,
    Markup.keyboard(buttons).resize()
  );
}

async function showRemindBeforeButtons(ctx) {
  const selected = ctx.scene.state.selectedRemindBefore;
  if (ctx.callbackQuery) {
    await ctx.editMessageText(
      'Оберіть, коли надіслати нагадування (натискай щоб додати/видалити):',
      Markup.inlineKeyboard([
        [0, 1, 3, 7].map((d) =>
          Markup.button.callback(selected.has(d) ? `✅ ${d} дн.` : `${d} дн.`, `toggle_${d}`)
        ),
        [
          Markup.button.callback('❎ Пропустити', 'skip_remind'),
          Markup.button.callback('💾 Зберегти', 'save_edit'),
          Markup.button.callback('❌ Скасувати', 'cancel_edit')
        ]
      ])
    );
  } else {
    await ctx.reply(
      'Оберіть, коли надіслати нагадування (натискай щоб додати/видалити):',
      Markup.inlineKeyboard([
        [0, 1, 3, 7].map((d) =>
          Markup.button.callback(selected.has(d) ? `✅ ${d} дн.` : `${d} дн.`, `toggle_${d}`)
        ),
        [
          Markup.button.callback('❎ Пропустити', 'skip_remind'),
          Markup.button.callback('💾 Зберегти', 'save_edit'),
          Markup.button.callback('❌ Скасувати', 'cancel_edit')
        ]
      ])
    );
  }
}

async function saveChanges(ctx) {
  const userId = ctx.from.id;
  const reminders = ctx.scene.state.remindersList;
  const reminderIndex = reminders.findIndex(r => r.id === ctx.scene.state.editId);

  if (reminderIndex === -1) {
    await ctx.reply('⚠️ Нагадування вже не існує.');
    return;
  }

  reminders[reminderIndex] = ctx.scene.state.reminder;
  saveUserReminders(userId, reminders);

  await ctx.reply(
    '✅ Всі зміни збережено.',
    Markup.keyboard(['↩️ Повернутись в меню редагування', '🏠 Головне меню']).resize()
  );
}

module.exports = editReminder;
