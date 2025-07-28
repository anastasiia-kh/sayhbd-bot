const { Telegraf, Scenes, session, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const express = require('express');
const addReminderScene = require('./addReminderScene');
const editReminderScene = require('./editReminderScene');
const { loadUserReminders, saveUserReminders } = require('./userStorage');

// Перевірка змінних середовища
if (!process.env.BOT_TOKEN || !process.env.RENDER_EXTERNAL_URL) {
  throw new Error('❌ BOT_TOKEN або RENDER_EXTERNAL_URL не задані у .env');
}

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();
const WEBHOOK_PATH = `/bot${process.env.BOT_TOKEN}`;
const WEBHOOK_URL = `${process.env.RENDER_EXTERNAL_URL}${WEBHOOK_PATH}`;

// Обчислення віку за датою
const calculateAge = (dateStr) => {
  const [day, month, yearRaw] = dateStr.split(/[./\-\s]+/);
  let year = parseInt(yearRaw);
  if (yearRaw?.length === 2) {
    const currentYear = new Date().getFullYear() % 100;
    const century = year > currentYear ? 1900 : 2000;
    year += century;
  }
  const birthDate = new Date(year, parseInt(month) - 1, parseInt(day));
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

// Шаблони повідомлень
const messageTemplates = [
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

// Сцени
const stage = new Scenes.Stage([addReminderScene, editReminderScene]);
bot.use(session());
bot.use(stage.middleware());

// Старт / меню
bot.start((ctx) => {
  ctx.reply(
    '👋 Привіт! Я тут, щоб підняти твій соц. рейтинг і вберегти від факапів з днями народження.\n\nОберіть дію нижче:',
    Markup.keyboard([
      ['➕ Додати нагадування'],
      ['📋 Список нагадувань'],
      ['ℹ️ Допомога']
    ]).resize()
  );
});

// Додати нагадування
bot.hears('➕ Додати нагадування', (ctx) => ctx.scene.enter('addReminder'));

// Список нагадувань
bot.hears('📋 Список нагадувань', (ctx) => {
  const reminders = loadUserReminders(ctx.from.id);
  if (!reminders.length) return ctx.reply('😶 У тебе ще нема жодного нагадування.');

  reminders.forEach((r, index) => {
    const [day, month] = r.date.split(/[./\-\s]+/);
    ctx.reply(
      `📌 ${r.note || '(без нотатки)'}\n📅 ${day.padStart(2, '0')}.${month.padStart(2, '0')}`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback('✏️ Змінити', `edit_${index}`),
          Markup.button.callback('🗑 Видалити', `delete_${index}`)
        ]
      ])
    );
  });
});

// Допомога
bot.hears('ℹ️ Допомога', (ctx) => {
  ctx.reply(
    `🛟 Як я працюю:

1️⃣ Натисни *"Додати нагадування"*, щоб створити нове.
2️⃣ Введи дату (наприклад, 25.07.1990)
3️⃣ Введи нотатку або натисни "Пропустити і зберегти"

📋 У *"Списку нагадувань"* можна:
— змінити ✏️
— або видалити 🗑

Я нагадаю тобі у день події 🎉

Підтримувані формати дати: 25.07.1995, 1/1/95, 10-12-2000`,
    { parse_mode: 'Markdown' }
  );
});

// Зміна нагадування
bot.action(/edit_(\d+)/, (ctx) => {
  ctx.session.editingIndex = Number(ctx.match[1]);
  ctx.answerCbQuery();
  ctx.scene.enter('editReminder');
});

// Видалення
bot.action(/delete_(\d+)/, (ctx) => {
  const index = Number(ctx.match[1]);
  const reminders = loadUserReminders(ctx.from.id);
  if (!reminders[index]) return ctx.answerCbQuery('⚠️ Нагадування не знайдено');
  reminders.splice(index, 1);
  saveUserReminders(ctx.from.id, reminders);
  ctx.answerCbQuery('🗑 Видалено!');
  ctx.editMessageText('🗑 Нагадування видалено');
});

// CRON-перевірка щохвилини
cron.schedule('* * * * *', () => {
  const today = new Date();
  const todayStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const users = fs.readdirSync(path.join(__dirname, 'data')).filter((file) => file.endsWith('.json'));

  users.forEach((userFile) => {
    const userId = userFile.replace('.json', '');
    const reminders = loadUserReminders(userId);
    reminders.forEach((r) => {
      if (!r.date) return;
      const [day, month] = r.date.split(/[./\-\s]+/);
      const dateStr = `${day.padStart(2, '0')}-${month.padStart(2, '0')}`;
      if (dateStr === todayStr) {
        const age = calculateAge(r.date);
        const note = r.note?.trim() || '';
        const dateForMessage = `${day.padStart(2, '0')}.${month.padStart(2, '0')}`;
        const template = messageTemplates[Math.floor(Math.random() * messageTemplates.length)];
        const msg = template
          .replace('{date}', dateForMessage)
          .replace('{age}', age)
          .replace('{note}', note);
        bot.telegram.sendMessage(userId, msg);
      }
    });
  });
});

// Webhook на Render
bot.telegram.setWebhook(WEBHOOK_URL);
app.use(bot.webhookCallback(WEBHOOK_PATH));

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
