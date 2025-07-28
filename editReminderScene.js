const { Scenes, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const dataDir = path.join(__dirname, 'data');
const getUserFilePath = (userId) => path.join(dataDir, `${userId}.json`);


const loadReminders = (userId) =>
  fs.existsSync(getUserFilePath(userId))
    ? JSON.parse(fs.readFileSync(getUserFilePath(userId)))
    : [];

const saveReminders = (userId, data) =>
  fs.writeFileSync(getUserFilePath(userId), JSON.stringify(data, null, 2));


const { loadUserReminders, saveUserReminders } = require('./userStorage');

const editReminder = new Scenes.BaseScene('editReminder');

editReminder.enter((ctx) => {
  const userId = ctx.from.id;
  const { editId, allReminders } = ctx.scene.state || {};
  console.log('editId:', editId);
  console.log('allReminders:', allReminders);

  const reminder = allReminders.find(r => r.id === editId);

  if (!reminder) {
    ctx.reply('⚠️ Не вдалося знайти нагадування.');
    return ctx.scene.leave();
  }

  ctx.scene.state.current = reminder;
  ctx.scene.state.selected = new Set(reminder.remindBefore || []);
  

  ctx.reply(
    `Редагуємо нагадування:\n📅 ${reminder.date}${reminder.note ? ` — ${reminder.note}` : ''}\n\nОберіть, коли нагадати:`,
    Markup.inlineKeyboard([
      [0, 1, 3, 7].map((d) => ({
        text: ctx.scene.state.selected.has(d) ? `✅ ${d} дн.` : `${d} дн.`,
        callback_data: `toggle_${d}`
      })),
      [
        { text: '💾 Зберегти', callback_data: 'save_edit' },
        { text: '❌ Скасувати', callback_data: 'cancel_edit' }
      ]
    ])
  );
});

editReminder.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;

  if (data.startsWith('toggle_')) {
    const day = parseInt(data.split('_')[1]);
    const selected = ctx.scene.state.selected;

    if (selected.has(day)) {
      selected.delete(day);
    } else {
      selected.add(day);
    }

    await ctx.editMessageReplyMarkup({
      inline_keyboard: [
        [0, 1, 3, 7].map((d) => ({
          text: selected.has(d) ? `✅ ${d} дн.` : `${d} дн.`,
          callback_data: `toggle_${d}`
        })),
        [
          { text: '💾 Зберегти', callback_data: 'save_edit' },
          { text: '❌ Скасувати', callback_data: 'cancel_edit' }
        ]
      ]
    });

    await ctx.answerCbQuery();
    return;
  }

  if (data === 'save_edit') {
    const userId = ctx.from.id;
    const editId = ctx.scene.state.editId;
    const reminders = loadReminders(userId);
    const reminderIndex = reminders.findIndex(r => r.id === editId);  // індекс шукаємо по id

    if (reminderIndex === -1) {
      await ctx.reply('⚠️ Нагадування вже не існує.');
      return ctx.scene.leave();
    }

    reminders[reminderIndex].remindBefore = [...ctx.scene.state.selected].sort((a, b) => a - b);
    saveReminders(userId, reminders);

    const successMessages = [
      '✅ Нагадування оновлено! Я пишаюсь тобою! 😎',
      '🎉 Ідеально! Тепер не забудеш навіть через 7 днів!',
      '📌 Збережено. Я щойно відчув приплив організованості!',
      '✨ Вау! Це нагадування виглядає краще, ніж мої алгоритми!',
      '🥳 Готово! Дата зафіксована. Залишилось лише святкувати!'
    ];

    await ctx.reply(successMessages[Math.floor(Math.random() * successMessages.length)], {
      reply_markup: {
        remove_keyboard: true
      }
    });

    return ctx.scene.leave();
  }

  if (data === 'cancel_edit') {
    await ctx.reply('❌ Редагування скасовано.');
    return ctx.scene.leave();
  }
});

module.exports = editReminder;
