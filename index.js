const { Telegraf, Scenes, session, Markup } = require('telegraf');
const cron = require('node-cron');
const fs = require('fs');
const { parse, format, isToday } = require('date-fns');

const bot = new Telegraf(process.env.BOT_TOKEN);
const remindersFile = '/tmp/reminders.json';

// Автоматичне створення reminders.json, якщо його не існує
if (!fs.existsSync(remindersFile)) {
  fs.writeFileSync(remindersFile, '{}');
}

const loadReminders = () => JSON.parse(fs.existsSync(remindersFile) ? fs.readFileSync(remindersFile) : '{}');
const saveReminders = (data) => fs.writeFileSync(remindersFile, JSON.stringify(data, null, 2));

const addReminderScene = new Scenes.WizardScene(
  'addReminder',
  (ctx) => {
    const datePrompts = [
  '📅 Кидай дату народження! Наприклад: 12.02.1990 або 1 квітня 1985.',
  '🎂 Напиши дату, тільки не «завтра» — я ж бот, не екстрасенс! 😄',
  '🗓️ Дата народження, будь ласка! Можна як хочеш, я розберуся.',
  '📆 Введи дату, поки не передумав вітати 😉',
  '👶 Коли зʼявилась ця легенда на світ? Дай дату!'
];
const randomPrompt = datePrompts[Math.floor(Math.random() * datePrompts.length)];
ctx.reply(randomPrompt);
    ctx.wizard.state.reminder = {};
    return ctx.wizard.next();
  },
  (ctx) => {
    ctx.wizard.state.reminder.date = ctx.message.text;
    ctx.reply('📝 Введіть нотатку або натисніть "Пропустити"', Markup.keyboard(['Пропустити']).oneTime().resize());
    return ctx.wizard.next();
  },
  (ctx) => {
    const note = ctx.message.text === 'Пропустити' ? '' : ctx.message.text;
    const reminders = loadReminders();
    const userId = ctx.from.id;
    if (!reminders[userId]) reminders[userId] = [];

    reminders[userId].push({ date: ctx.wizard.state.reminder.date, note });
    saveReminders(reminders);

    const messages = [
  '✅ Нагадування збережено!',
  '📅 Записав! Тепер не забудеш.',
  '📓 Додано в мій список памʼяті!',
  '🧠 Занотовано! Я вже запамʼятав.',
  '🎯 Є контакт! Я нагадаю обовʼязково.'
];
const randomMsg = messages[Math.floor(Math.random() * messages.length)];
ctx.reply(randomMsg, Markup.removeKeyboard());
    return ctx.scene.leave();
  }
);

const stage = new Scenes.Stage([addReminderScene]);
bot.use(session());
bot.use(stage.middleware());

bot.start((ctx) => {
  const name = ctx.from.first_name || 'друже';
  ctx.reply(
    `👋 Привіт, ${name}!
Я той самий бот, якого не вистачало в твоєму житті, коли ти писав «З Днем народження» на два дні пізніше... 😏🎂
Додай нагадування — і більше жодних фейлів!`,
    Markup.keyboard([['📋 Список нагадувань', '➕ Додати нагадування']]).resize()
  );
});

bot.command('list', (ctx) => {
  const reminders = loadReminders()[ctx.from.id] || [];
  if (!reminders.length) return ctx.reply('📭 Немає збережених нагадувань.');

  reminders.forEach((r, i) => {
    const text = `${i + 1}. ${r.date}${r.note ? ' — ' + r.note : ''}`;
    ctx.reply(text, Markup.inlineKeyboard([
      Markup.button.callback('✏️ Редагувати', `edit_${i}`),
      Markup.button.callback('🗑 Видалити', `delete_${i}`)
    ]));
  });
});

bot.action(/delete_(\d+)/, (ctx) => {
  const idx = Number(ctx.match[1]);
  const reminders = loadReminders();
  const userId = ctx.from.id;
  if (reminders[userId]) reminders[userId].splice(idx, 1);
  saveReminders(reminders);
  const deleteMessages = [
  '🗑 Нагадування видалено!',
  '💨 І слід простиг!',
  '🚮 Викинув як старий календар.',
  '❌ Готово! Можна забути про це.',
  '📤 Видалено без жалю... майже 😢'
];
const deletedMsg = deleteMessages[Math.floor(Math.random() * deleteMessages.length)];
ctx.editMessageText(deletedMsg);
});

bot.action(/edit_(\d+)/, (ctx) => {
  const idx = Number(ctx.match[1]);
  ctx.session.editIdx = idx;
  ctx.session.tempReminder = { ...loadReminders()[ctx.from.id][idx] };
  ctx.session.editStep = 'date';
  ctx.reply('📅 Введіть нову дату (або натисніть "Далі")', Markup.inlineKeyboard([
    Markup.button.callback('➡️ Далі', 'skip_to_note')
  ]));
});

bot.action('skip_to_note', (ctx) => {
  ctx.session.editStep = 'note';
  ctx.reply('📝 Введіть нову нотатку (або натисніть "Зберегти")', Markup.inlineKeyboard([
    Markup.button.callback('✅ Зберегти', 'save_edit')
  ]));
});

bot.action('save_edit', (ctx) => {
  const reminders = loadReminders();
  const userId = ctx.from.id;
  const idx = ctx.session.editIdx;
  const original = reminders[userId][idx];
  const updated = ctx.session.tempReminder;

  if (original.date === updated.date && original.note === updated.note) {
    ctx.reply('ℹ️ Жодних змін не внесено.');
  } else {
    reminders[userId][idx] = updated;
    saveReminders(reminders);
    const editMessages = [
  '✅ Нагадування оновлено!',
  '🛠️ Підрихтував, як ти просив!',
  '📋 Нові дані збережено!',
  '🔁 Все оновлено, як новеньке!',
  '✏️ Виправив! Більше ніяких помилок.'
];
const editedMsg = editMessages[Math.floor(Math.random() * editMessages.length)];
ctx.reply(editedMsg);
  }
  delete ctx.session.editIdx;
  delete ctx.session.editStep;
  delete ctx.session.tempReminder;
});

bot.on('text', (ctx) => {
  if (ctx.session.editIdx !== undefined) {
    const userId = ctx.from.id;
    const step = ctx.session.editStep;

    if (step === 'date') {
      ctx.session.tempReminder.date = ctx.message.text;
      ctx.session.editStep = 'note';
      ctx.reply('Тепер введіть нову нотатку (або натисніть "Зберегти")', Markup.inlineKeyboard([
        Markup.button.callback('✅ Зберегти', 'save_edit')
      ]));
    } else if (step === 'note') {
      ctx.session.tempReminder.note = ctx.message.text === 'Пропустити' ? '' : ctx.message.text;
      ctx.reply('💾 Натисніть "Зберегти", щоб підтвердити зміни.', Markup.inlineKeyboard([
        Markup.button.callback('✅ Зберегти', 'save_edit')
      ]));
    }
  }
});

const checkReminders = () => {
  const reminders = loadReminders();
  Object.entries(reminders).forEach(([userId, items]) => {
    items.forEach((item) => {
      const parsedDate = parse(item.date, 'dd.MM.yyyy', new Date());
      if (isToday(parsedDate)) {
        const age = new Date().getFullYear() - parsedDate.getFullYear();
        const ageText = age > 0 ? ` — виповнюється ${age} років!` : '';
        bot.telegram.sendMessage(userId, `🎉 Сьогодні день народження: ${item.note || ''}${ageText}`);
      }
    });
  });
};

cron.schedule('*/2 * * * *', () => {
  console.log('⏰ Перевірка нагадувань о 09:00');
  checkReminders();
});

bot.launch();
console.log('Бот запущено');
