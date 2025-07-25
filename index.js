const { Telegraf, Scenes, session, Markup } = require('telegraf');
const cron = require('node-cron');
const fs = require('fs');
const express = require('express');
const { parse, format, isToday, differenceInYears } = require('date-fns');

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();

const remindersFile = '/tmp/reminders.json';
if (!fs.existsSync(remindersFile)) {
  fs.writeFileSync(remindersFile, '{}');
}
const loadReminders = () => JSON.parse(fs.existsSync(remindersFile) ? fs.readFileSync(remindersFile) : '{}');
const saveReminders = (data) => fs.writeFileSync(remindersFile, JSON.stringify(data, null, 2));

const addReminderScene = new Scenes.WizardScene(
  'addReminder',
  (ctx) => {
    try {
      const prompts = [
        '📅 Кидай дату народження! Наприклад: 12.02.1990 або 1 квітня 1985.',
        '🎂 Напиши дату, тільки не «завтра» — я ж бот, не екстрасенс! 😄',
        '🗓️ Дата народження, будь ласка! Можна як хочеш, я розберуся.',
        '📆 Введи дату, поки не передумав вітати 😉',
        '👶 Коли зʼявилась ця легенда на світ? Дай дату!'
      ];
      const message = prompts[Math.floor(Math.random() * prompts.length)];
      ctx.reply(message);
      ctx.wizard.state.reminder = {};
      return ctx.wizard.next();
    } catch (err) {
      console.error('❌ Помилка на кроці 1 (дата):', err);
      ctx.reply('⚠️ Щось пішло не так при введенні дати. Спробуй ще раз.');
    }
  },
  (ctx) => {
    try {
      if (!ctx.message || !ctx.message.text) {
        return ctx.reply('⚠️ Будь ласка, введи дату у вигляді тексту.');
      }
      const userInput = ctx.message.text.trim();
      const dateVariants = [
        'dd.MM.yyyy', 'd.MM.yyyy', 'dd.M.yyyy', 'd.M.yyyy',
        'dd-MM-yyyy', 'd-MM-yyyy', 'dd-M-yyyy', 'd-M-yyyy',
        'dd/MM/yyyy', 'd/MM/yyyy', 'dd/M/yyyy', 'd/M/yyyy',
        'dd.MM.yy', 'd.MM.yy', 'dd.M.yy', 'd.M.yy',
        'dd-MM-yy', 'd-MM-yy', 'dd-M-yy', 'd-M-yy',
        'dd/MM/yy', 'd/MM/yy', 'dd/M/yy', 'd/M/yy',
        "dd MMMM yyyy", "dd MMMM yy", "d MMMM yyyy", "d MMMM yy",
        "ddMMMM yyyy", "ddMMMMyy", "dMMMM yyyy", "dMMMMyy"
      ];
      let parsedDate;
      for (const formatStr of dateVariants) {
        try {
          parsedDate = parse(userInput, formatStr, new Date());
          if (!isNaN(parsedDate)) break;
        } catch {}
      }
      if (!parsedDate || isNaN(parsedDate)) {
        return ctx.reply('⚠️ Не вдалося розпізнати дату. Спробуй у форматі: 12.02.1990, 2/12/95 або 02 грудня 1995.');
      }
      const normalized = format(parsedDate, 'dd.MM.yyyy');
      ctx.wizard.state.reminder.date = normalized;
      ctx.reply('📝 Введіть нотатку або натисніть "Пропустити"', Markup.keyboard(['Пропустити']).oneTime().resize());
      return ctx.wizard.next();
    } catch (err) {
      console.error('❌ Помилка на кроці 2 (нотатка):', err);
      ctx.reply('⚠️ Щось пішло не так при введенні нотатки. Спробуй ще раз.');
    }
  },
  (ctx) => {
    try {
      if (!ctx.message || !ctx.message.text) {
        return ctx.reply('⚠️ Надішли текст нотатки або натисни "Пропустити".');
      }
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
    } catch (err) {
      console.error('❌ Помилка на кроці 3 (збереження):', err);
      ctx.reply('⚠️ Не вдалося зберегти нагадування. Спробуй ще раз.');
    }
  }
);

const stage = new Scenes.Stage([addReminderScene]);
bot.use(session());
bot.use(stage.middleware());

bot.start((ctx) => {
  const name = ctx.from.first_name || 'друже';
  ctx.reply(
    `👋 Привіт, ${name}!
Я той самий бот, якого не вистачало в твоєму житті, коли ти писав «З Днем народження» на два дні пізніше... 😏🎂\nДодай нагадування — і більше жодних фейлів!`,
    Markup.keyboard([['📋 Список нагадувань', '➕ Додати нагадування']]).resize()
  );
});

bot.hears('➕ Додати нагадування', (ctx) => ctx.scene.enter('addReminder'));

bot.hears('📋 Список нагадувань', (ctx) => {
  const userId = ctx.from.id;
  const reminders = loadReminders();
  const userReminders = reminders[userId] || [];
  if (userReminders.length === 0) {
    return ctx.reply('📭 У тебе поки немає жодного нагадування.');
  }
  userReminders.forEach((reminder, index) => {
    const age = reminder.date.match(/\d{4}/)
      ? ` — виповнюється ${differenceInYears(new Date(), parse(reminder.date, 'dd.MM.yyyy', new Date()))}`
      : '';
    const caption = `🎉 ${reminder.date}${age}${reminder.note ? `\n📝 ${reminder.note}` : ''}`;
    ctx.reply(caption, Markup.inlineKeyboard([
      [
        Markup.button.callback('✏️ Редагувати', `edit_${index}`),
        Markup.button.callback('🗑️ Видалити', `delete_${index}`)
      ]
    ]));
  });
});

const birthdayTemplates = [
  `🎉 Сьогодні важлива дата!\n📅 {date} — виповнюється {age} років!\n{note}`,
  `🦄 Увага-увага! День народження на горизонті!\n🎂 {date} — {age} років!\n{note}`,
  `🔔 Біп-боп! Святковий алерт!\n🗓 {date} — святкуємо {age} років!\n{note}`,
  `🌟 {date} — {age} років\n{note}`
];

cron.schedule('* * * * *', () => {
  const reminders = loadReminders();
  const today = format(new Date(), 'dd.MM');
  Object.entries(reminders).forEach(([userId, userReminders]) => {
    userReminders.forEach((reminder) => {
      const parsed = parse(reminder.date, 'dd.MM.yyyy', new Date());
      const reminderDate = format(parsed, 'dd.MM');
      if (reminderDate === today) {
        const age = differenceInYears(new Date(), parsed);
        const template = birthdayTemplates[Math.floor(Math.random() * birthdayTemplates.length)];
        const text = template
          .replace('{date}', reminder.date)
          .replace('{age}', age)
          .replace('{note}', reminder.note || '');
        bot.telegram.sendMessage(userId, text);
      }
    });
  });
});

app.use(express.json());
app.use(bot.webhookCallback('/webhook'));
app.get('/', (req, res) => res.send('OK'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер слухає порт ${PORT}`);
});
if (process.env.RENDER_EXTERNAL_URL) {
  bot.telegram.setWebhook(`${process.env.RENDER_EXTERNAL_URL}/webhook`);
}
