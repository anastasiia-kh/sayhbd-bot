const { Telegraf, Scenes, session, Markup } = require('telegraf');
const cron = require('node-cron');
const fs = require('fs');
const express = require('express');
const { parse, format, isToday, differenceInYears } = require('date-fns');

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();

const dataDir = './userData';
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const getUserFilePath = (userId) => `${dataDir}/${userId}.json`;

const loadUserReminders = (userId) => {
  const filePath = getUserFilePath(userId);
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath));
};

const saveUserReminders = (userId, data) => {
  const filePath = getUserFilePath(userId);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

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

      if (parsedDate.getFullYear() < 100) {
        const year = parsedDate.getFullYear();
        const currentYear = new Date().getFullYear();
        const yearCandidate = 2000 + year;
        parsedDate.setFullYear(
          yearCandidate <= currentYear ? yearCandidate : 1900 + year
        );
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
      const userId = ctx.from.id;
      const reminders = loadUserReminders(userId);
      reminders.push({ date: ctx.wizard.state.reminder.date, note });
      saveUserReminders(userId, reminders);
      const messages = [
        '✅ Нагадування збережено!',
        '📅 Записав! Тепер не забудеш.',
        '📓 Додано в мій список памʼяті!',
        '🧠 Занотовано! Я вже запамʼятав.',
        '🎯 Є контакт! Я нагадаю обовʼязково.'
      ];
      const randomMsg = messages[Math.floor(Math.random() * messages.length)];
      ctx.reply(randomMsg, Markup.keyboard([['📋 Список нагадувань', '➕ Додати нагадування']]).resize());
      return ctx.scene.leave();
    } catch (err) {
      console.error('❌ Помилка на кроці 3 (збереження):', err);
      ctx.reply('⚠️ Не вдалося зберегти нагадування. Спробуй ще раз.');
    }
  }
);

cron.schedule('* * * * *', () => {
  const today = new Date();
  const todayStr = format(today, 'dd.MM');
  const userFiles = fs.readdirSync(dataDir).filter((f) => f.endsWith('.json'));

  for (const file of userFiles) {
    const userId = file.replace('.json', '');
    const entries = loadUserReminders(userId);

    entries.forEach((r) => {
      if (r.date.slice(0, 5) === todayStr) {
        const birthDate = new Date(r.date);
        const age = Math.max(0, differenceInYears(today, birthDate));
        const note = r.note || '';
        const shortDate = format(birthDate, 'dd.MM');

        const templates = [
          `🎉 Сьогодні важлива дата!\n📅 {date} — виповнюється {age} років!\n{note}`,
          `🦄 Увага-увага! День народження на горизонті!\n🎂 {date} — {age} років!\n{note}`,
          `🔔 Біп-боп! Святковий алерт!\n🗓 {date} — святкуємо {age} років!\n{note}`,
          `🎈 Йо-хо-хо! Хтось сьогодні святкує!\n📆 {date} — {age} років на планеті!\n{note}`,
          `👑 Королівське свято!\n📅 {date} — {age} років мудрості й чарівності!\n{note}`,
          `🚀 Запускаємо феєрверки! Бо сьогодні особливий день!\n🗓 {date} — {age} років святкування!\n{note}`,
          `🕺 Танці, шампанське і торт!\n📅 {date} — {age} років магії!\n{note}`,
          `🌈 День, коли народилась легенда!\n📅 {date} — {age} років!\n{note}`,
          `📣 Алло, всім увага!\n{date} — день народження!\n🎁 {age} років — круто ж як!\n{note}`
        ];

        const template = templates[Math.floor(Math.random() * templates.length)];
        const message = template
          .replace('{date}', shortDate)
          .replace('{age}', age)
          .replace('{note}', note);

        bot.telegram.sendMessage(userId, message);
      }
    });
  }
});

const stage = new Scenes.Stage([addReminderScene]);
bot.use(session());
bot.use(stage.middleware());

bot.command('add', (ctx) => ctx.scene.enter('addReminder'));
bot.hears('➕ Додати нагадування', (ctx) => ctx.scene.enter('addReminder'));
bot.start((ctx) => {
  ctx.reply(
    '👋 Привіт! Я нагадаю тобі про дні народження 🎉\nОбери дію:',
    Markup.keyboard([['➕ Додати нагадування', '📋 Список нагадувань']]).resize()
  );
});

bot.launch();

const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => {
  res.send('SayHBD bot is running 🎉');
});
app.listen(PORT, () => {
  console.log(`✅ Server is listening on port ${PORT}`);
});
