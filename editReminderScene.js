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

const feedbacks = {
  0: ['🎉 У сам день — святкуємо разом!', '🎂 Прямо в день події — шикарно!'],
  1: ['⏳ За день? Ідеальний таймінг!', '📌 Гарно! Є ще доба на підготовку.'],
  3: ['🧠 За 3 дні — ідея генія!', '🔮 Прогнозовано і точно.'],
  7: ['📅 За тиждень? Так тримати!', '🛎 Це стратегічно.']
};

const editReminder = new Scenes.BaseScene('editReminder');

editReminder.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;

  if (data === 'save_edit') {
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
