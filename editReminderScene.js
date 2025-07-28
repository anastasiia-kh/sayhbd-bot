const { Scenes, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');

const dataDir = './userData';
const getUserFilePath = (userId) => path.join(dataDir, `${userId}.json`);
const loadReminders = (userId) =>
  fs.existsSync(getUserFilePath(userId))
    ? JSON.parse(fs.readFileSync(getUserFilePath(userId)))
    : [];
const saveReminders = (userId, data) =>
  fs.writeFileSync(getUserFilePath(userId), JSON.stringify(data, null, 2));

const editReminder = new Scenes.BaseScene('editReminder');

// Вхід у сцену редагування
editReminder.enter((ctx) => {
  const userId = ctx.from.id;
  const reminders = ctx.scene.state.allReminders || loadReminders(userId);
  const index = ctx.scene.state.editIndex;
  const reminder = reminders[index];

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

// Обробка натискань кнопок
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

    // Оновлення кнопок
    ctx.editMessageReplyMarkup({
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
    return;
  }

  if (data === 'save_edit') {
    const userId = ctx.from.id;
    const index = ctx.scene.state.editIndex;
    const reminders = loadReminders(userId);
    reminders[index].remindBefore = [...ctx.scene.state.selected].sort((a, b) => a - b);
    saveReminders(userId, reminders);

    const successMessages = [
      '✅ Нагадування оновлено! Я пишаюсь тобою! 😎',
      '🎉 Ідеально! Тепер не забудеш навіть через 7 днів!',
      '📌 Збережено. Я щойно відчув приплив організованості!',
      '✨ Вау! Це нагадування виглядає краще, ніж мої алгоритми!',
      '🥳 Готово! Дата зафіксована. Залишилось лише святкувати!'
    ];
    ctx.reply(successMessages[Math.floor(Math.random() * successMessages.length)]);
    return ctx.scene.leave();
  }

  if (data === 'cancel_edit') {
    ctx.reply('❌ Редагування скасовано.');
    return ctx.scene.leave();
  }
});

module.exports = editReminder;
