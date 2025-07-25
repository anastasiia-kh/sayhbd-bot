const { Telegraf, Scenes, session, Markup } = require('telegraf');
const fs = require('fs');
const { parse, format, isToday } = require('date-fns');

const bot = new Telegraf('7520027372:AAG6I_xS7O8adDg83Nue6zb8gNljDFVWMe4');
const remindersFile = 'reminders.json';

// Helpers
const loadReminders = () => JSON.parse(fs.existsSync(remindersFile) ? fs.readFileSync(remindersFile) : '{}');
const saveReminders = (data) => fs.writeFileSync(remindersFile, JSON.stringify(data, null, 2));

// Scenes
const addReminderScene = new Scenes.WizardScene(
  'addReminder',
  (ctx) => {
    ctx.reply('Введіть дату народження (будь-який формат, наприклад 12.02.1990):');
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

// Commands
bot.start((ctx) => ctx.reply('Привіт! Я бот для нагадувань про дні народження.\n/add — додати\n/list — список нагадувань'));

bot.command('add', (ctx) => ctx.scene.enter('addReminder'));

bot.command('list', (ctx) => {
  const reminders = loadReminders()[ctx.from.id] || [];
  if (!reminders.length) return ctx.reply('Немає збережених нагадувань.');

  reminders.forEach((r, i) => {
    ctx.reply(`${i + 1}. ${r.date} — ${r.note || 'без нотатки'}`);
  });
});

// Щоденні сповіщення
const checkReminders = () => {
  const reminders = loadReminders();
  Object.entries(reminders).forEach(([userId, items]) => {
    items.forEach((item) => {
      const parsedDate = parse(item.date, 'dd.MM.yyyy', new Date());
      if (isToday(parsedDate)) {
        const age = new Date().getFullYear() - parsedDate.getFullYear();
        const ageText = age > 0 ? ` — виповнюється ${age} років!` : '';
        bot.telegram.sendMessage(userId, `🎉 Сьогодні день народження: ${item.note || 'без нотатки'}${ageText}`);
      }
    });
  });
};

// перевірка кожен день о 9:00
setInterval(checkReminders, 1000 * 60 * 60 * 24);

bot.launch();
console.log('Бот запущено');
