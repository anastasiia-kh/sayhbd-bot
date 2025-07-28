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

const editReminder = new Scenes.WizardScene(
  'editReminder',
  (ctx) => {
    const reminders = loadReminders(ctx.from.id);
    const index = ctx.session.editingIndex;
    if (!reminders[index]) {
      ctx.reply('⚠️ Нагадування не знайдено.');
      return ctx.scene.leave();
    }

    ctx.session.reminders = reminders;
    ctx.session.newData = {
      date: reminders[index].date,
      note: reminders[index].note || '',
      remindBefore: reminders[index].remindBefore || [0]
    };

    ctx.reply(
      '✏️ Введи нову дату (наприклад, 25.07.1995):',
      Markup.inlineKeyboard([
        [Markup.button.callback('⏭ Пропустити', 'skip_date')],
        [Markup.button.callback('❌ Скасувати', 'cancel_edit')]
      ])
    );
    return ctx.wizard.next();
  },

  (ctx) => {
    if (ctx.callbackQuery?.data === 'skip_date') {
      ctx.answerCbQuery();
    } else if (ctx.callbackQuery?.data === 'cancel_edit') {
      ctx.answerCbQuery();
      ctx.reply('❌ Редагування скасовано.');
      return ctx.scene.leave();
    } else {
      const dateText = ctx.message?.text;
      if (!dateText || !/^\d{1,2}[./\-\s]\d{1,2}([./\-\s]\d{2,4})?$/.test(dateText)) {
        return ctx.reply('⚠️ Некоректна дата. Приклад: 25.07.1995');
      }
      ctx.session.newData.date = dateText.trim();
    }

    ctx.reply(
      '📝 Введи нову нотатку (або залиш порожньо):',
      Markup.inlineKeyboard([
        [Markup.button.callback('⏭ Пропустити', 'skip_note')],
        [Markup.button.callback('❌ Скасувати', 'cancel_edit')]
      ])
    );
    return ctx.wizard.next();
  },

  (ctx) => {
    if (ctx.callbackQuery?.data === 'skip_note') {
      ctx.answerCbQuery();
    } else if (ctx.callbackQuery?.data === 'cancel_edit') {
      ctx.answerCbQuery();
      ctx.reply('❌ Редагування скасовано.');
      return ctx.scene.leave();
    } else {
      ctx.session.newData.note = ctx.message?.text?.trim() || '';
    }

    const selected = ctx.session.newData.remindBefore;
    const getKeyboard = () => {
      return Markup.inlineKeyboard([
        [0, 1, 3, 7].map((d) => Markup.button.callback(`${selected.includes(d) ? '✅' : '☐'} ${d} дн.`, `toggle_${d}`))],
        [Markup.button.callback('✅ Зберегти', 'save_edit'), Markup.button.callback('❌ Скасувати', 'cancel_edit')]
      ]);
    };

    ctx.reply('🔁 Обери, коли нагадати (можна декілька):', getKeyboard());
    return ctx.wizard.next();
  },

  async (ctx) => {
    const data = ctx.callbackQuery?.data;
    if (!data) return;
    const selected = ctx.session.newData.remindBefore;

    if (data.startsWith('toggle_')) {
      const value = parseInt(data.replace('toggle_', ''));
      const index = selected.indexOf(value);
      if (index > -1) selected.splice(index, 1);
      else selected.push(value);
      selected.sort((a, b) => a - b);
      await ctx.editMessageReplyMarkup({
        inline_keyboard: [
          [0, 1, 3, 7].map((d) => Markup.button.callback(`${selected.includes(d) ? '✅' : '☐'} ${d} дн.`, `toggle_${d}`))],
          [Markup.button.callback('✅ Зберегти', 'save_edit'), Markup.button.callback('❌ Скасувати', 'cancel_edit')]
        ]
      });
      const pool = feedbacks[value];
      if (pool) {
        const msg = pool[Math.floor(Math.random() * pool.length)];
        await ctx.reply(msg);
      }
      return;
    }

    if (data === 'save_edit') {
      const index = ctx.session.editingIndex;
      const reminders = ctx.session.reminders;
      reminders[index] = ctx.session.newData;
      saveReminders(ctx.from.id, reminders);
      await ctx.editMessageReplyMarkup();
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
  }
);

module.exports = editReminder;
