const { Telegraf, Scenes, session, Markup } = require('telegraf');
const fs = require('fs');
const { parse, format, isToday } = require('date-fns');

const bot = new Telegraf(process.env.BOT_TOKEN);
const remindersFile = '/tmp/reminders.json';

// Автоматичне створення reminders.json, якщо його не існує
if (!fs.existsSync(remindersFile)) {
  fs.writeFileSync(remindersFile, '{}');
}');
}

const loadReminders = () => JSON.parse(fs.existsSync(remindersFile) ? fs.readFileSync(remindersFile) : '{}');
const saveReminders = (data) => fs.writeFileSync(remindersFile, JSON.stringify(data, null, 2));

const addReminderScene = new Scenes.WizardScene(
  'addReminder',
  (ctx) => {
    ctx.reply('Введіть дату народження (наприклад 12.02.1990):');
    ctx.wizard.state.reminder = {};
    return ctx.wizard.next();
  },
  (ctx) => {
    ctx.wizard.state.reminder.date = ctx.message.text;
    ctx.reply('Введіть нотатку або натисніть "Пропустити"', Markup.keyboard(['Пропустити']).oneTime().resize());
    return ctx.wizard.next();
  },
  (ctx) => {
    const note = ctx.message.text === 'Пропустити' ? '' : ctx.message.text;
    const reminders = loadReminders();
    const userId = ctx.from.id;
    if (!reminders[userId]) reminders[userId] = [];

    reminders[userId].push({ date: ctx.wizard.state.reminder.date, note });
    saveReminders(reminders);

    ctx.reply('Нагадування збережено!', Markup.removeKeyboard());
    return ctx.scene.leave();
  }
);

const stage = new Scenes.Stage([addReminderScene]);
bot.use(session());
bot.use(stage.middleware());

bot.start((ctx) => ctx.reply('Привіт! Я бот для нагадувань про дні народження.\n/add — додати\n/list — список нагадувань'));

bot.command('add', (ctx) => ctx.scene.enter('addReminder'));

bot.command('list', (ctx) => {
  const reminders = loadReminders()[ctx.from.id] || [];
  if (!reminders.length) return ctx.reply('Немає збережених нагадувань.');

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
  ctx.editMessageText('Нагадування видалено!');
});

bot.action(/edit_(\d+)/, (ctx) => {
  const idx = Number(ctx.match[1]);
  ctx.session.editIdx = idx;
  ctx.reply('Введіть нову дату (наприклад 12.02.1990):');
  ctx.session.editStep = 'date';
});

bot.on('text', (ctx) => {
  if (ctx.session.editIdx !== undefined) {
    const reminders = loadReminders();
    const userId = ctx.from.id;

    if (ctx.session.editStep === 'date') {
      reminders[userId][ctx.session.editIdx].date = ctx.message.text;
      ctx.session.editStep = 'note';
      saveReminders(reminders);
      ctx.reply('Тепер введіть нотатку або напишіть "Пропустити"');
    } else if (ctx.session.editStep === 'note') {
      reminders[userId][ctx.session.editIdx].note = ctx.message.text === 'Пропустити' ? '' : ctx.message.text;
      saveReminders(reminders);
      ctx.reply('Нагадування оновлено!');
      delete ctx.session.editIdx;
      delete ctx.session.editStep;
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

setInterval(checkReminders, 1000 * 60 * 60 * 24);

bot.launch();
console.log('Бот запущено');
