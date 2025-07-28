const { Telegraf, Scenes, session } = require('telegraf');
const express = require('express');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');

const addReminderScene = require('./addReminderScene');
const editReminderScene = require('./editReminderScene');
const { loadUserReminders, saveUserReminders } = require('./userStorage');

const bot = new Telegraf(process.env.BOT_TOKEN);
const stage = new Scenes.Stage([addReminderScene, editReminderScene]);

bot.use(session());
bot.use(stage.middleware());

const mainMenuKeyboard = {
  reply_markup: {
    keyboard: [
      ['➕ Додати нагадування'],
      ['📋 Список нагадувань'],
      ['ℹ️ Допомога']
    ],
    resize_keyboard: true
  }
};

const messageTemplates = [
  '🦄 Увага-увага! День наближається!\n📅 {date} — {note}{age}',
  '🎂 Гей! Не забудь!\n📌 {note}\n📅 {date}{age}',
  '🎈 Щось важливе скоро трапиться!\n📎 {note}\n📅 {date}{age}',
  '✨ Не пропусти особливу дату: {date}\n{note}{age}',
  '🥳 Час відсвяткувати вже скоро!\n📅 {date}\n{note}{age}',
  '🎊 Подія наближається!\n📅 {date}\n{note}{age}'
];

function calculateAge(dateStr) {
  const parts = dateStr.split(/[./\-\s]+/);
  if (parts.length !== 3) return null;
  const [day, month, yearRaw] = parts;
  let year = parseInt(yearRaw);
  if (yearRaw.length === 2) {
    const currentYear = new Date().getFullYear() % 100;
    const century = year > currentYear ? 1900 : 2000;
    year += century;
  }

  const birthDate = new Date(year, parseInt(month) - 1, parseInt(day));
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age > 0 ? ` — виповнюється ${age} 🎉` : '';
}

function ensureRemindersHaveIds(userId) {
  const reminders = loadUserReminders(userId);
  let updated = false;

  reminders.forEach((r) => {
    if (!r.id) {
      r.id = uuidv4();
      updated = true;
    }
    if (!Array.isArray(r.remindBefore)) {
      r.remindBefore = [];
      updated = true;
    }
  });

  if (updated) {
    saveUserReminders(userId, reminders);
  }

  return reminders;
}


bot.start((ctx) => {
  ctx.reply(
    'Привіт! Я нагадаю про важливі дати 🎉\n\n➕ Додай нагадування, обери коли саме нагадати (за кілька днів або в сам день), і я не дам забути!',
    mainMenuKeyboard
  );
});

bot.hears('➕ Додати нагадування', (ctx) => ctx.scene.enter('addReminder'));

bot.hears('📋 Список нагадувань', (ctx) => {
  const reminders = ensureRemindersHaveIds(ctx.from.id);
  if (!reminders.length) {
    return ctx.reply('Наразі у тебе немає жодного нагадування.');
  }

  reminders.forEach((r) => {
    const remindText = r.remindBefore?.length
      ? `⏱ [${r.remindBefore.join(', ')} дн.]`
      : '';
    const text = `${r.date}${r.note ? ` — ${r.note}` : ''} ${remindText}`;

    ctx.reply(text, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✏️ Редагувати', callback_data: `edit_${r.id}` },
            { text: '🗑 Видалити', callback_data: `delete_${r.id}` }
          ]
        ]
      }
    });
  });
});

bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const userId = ctx.from.id;
  const reminders = loadUserReminders(userId);

   console.log('Callback data:', data);
  console.log('Reminders:', reminders);

if (data.startsWith('edit_')) {
  const id = data.split('_')[1];
  const reminders = loadUserReminders(userId);
  const reminderIndex = reminders.findIndex(r => r.id === id);

  if (reminderIndex !== -1) {
    ctx.scene.state = {
      editId: id,              // ТУТ має бути id, а не індекс
      allReminders: reminders
    };
    return ctx.scene.enter('editReminder');
  } else {
    return ctx.reply('⚠️ Це нагадування вже не існує.');
  }
}



  if (data.startsWith('delete_')) {
    const id = data.split('_')[1];
    const reminderIndex = reminders.findIndex(r => r.id === id);

    if (reminderIndex !== -1) {
      reminders.splice(reminderIndex, 1);
      saveUserReminders(userId, reminders);
      return ctx.editMessageText('🗑 Нагадування видалено.');
    } else {
      return ctx.reply('⚠️ Нагадування не знайдено.');
    }
  }
});

bot.hears('ℹ️ Допомога', (ctx) => {
  ctx.reply(
    `ℹ️ Я бот для нагадувань про дні народження (і не тільки).
Ти можеш:
• ➕ додати нагадування
• 📋 переглянути список
• 🔔 отримувати нагадування у день події або раніше

Натисни кнопку нижче, щоб почати!`,
    mainMenuKeyboard
  );
});

cron.schedule('* * * * *', () => {
  const today = new Date();

  const users = fs
    .readdirSync(path.join(__dirname, 'data'))
    .filter((f) => f.endsWith('.json'));

  users.forEach((userFile) => {
    const userId = userFile.replace('.json', '');
    const reminders = ensureRemindersHaveIds(userId);

    reminders.forEach((r) => {
      if (!r.date || !Array.isArray(r.remindBefore)) return;

      const [d, m, y] = r.date.split(/[./\-\s]+/);
      let year = parseInt(y);
      if (y.length === 2) {
        const currentYear = new Date().getFullYear() % 100;
        const century = year > currentYear ? 1900 : 2000;
        year += century;
      }

      const eventDate = new Date(year, parseInt(m) - 1, parseInt(d));

      r.remindBefore.forEach((daysBefore) => {
        const reminderDate = new Date(eventDate);
        reminderDate.setDate(reminderDate.getDate() - daysBefore);

        if (
          reminderDate.getDate() === today.getDate() &&
          reminderDate.getMonth() === today.getMonth()
        ) {
          const note = r.note || '';
          const dateStr = `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}`;
          const age = calculateAge(r.date);

          const whenText =
            daysBefore === 0
              ? '🎂 Сьогодні — особлива подія!'
              : `⏰ Через ${daysBefore} дн${daysBefore === 1 ? 'ь' : 'і'} — не забудь!`;

          const template = messageTemplates[Math.floor(Math.random() * messageTemplates.length)];
          const finalText =
            `${whenText}\n\n` +
            template
              .replace('{date}', dateStr)
              .replace('{note}', note)
              .replace('{age}', age || '');

          bot.telegram.sendMessage(userId, finalText);
        }
      });
    });
  });
});

// Для Render
const app = express();
app.use(express.json());
app.use(bot.webhookCallback('/'));

bot.telegram.setWebhook(`${process.env.RENDER_EXTERNAL_URL}/`);
app.listen(3000, () => {
  console.log('🌐 Webhook server running on port 3000');
});
