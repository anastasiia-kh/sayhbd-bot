const { Scenes, Markup } = require('telegraf');
const { loadUserReminders, saveUserReminders } = require('./userStorage');

const mainMenuKeyboard = Markup.keyboard([
  ['➕ Додати нагадування'],
  ['📋 Список нагадувань'],
  ['ℹ️ Допомога']
]).resize();

const editSuccessMessages = [
  '✏️ Готово! Я переписав усе краще, ніж будь-який редактор 📚',
  '🛠️ Оновлено! Тепер виглядає ще краще!',
  '✅ Все підправлено, як ти просив(ла)',
  '📝 Запис оновлено. Тепер у мене остання версія!',
  '🔁 Все змінив. Свіже, як тільки з редактора!',
  '💾 Збережено! У новій редакції виглядає чудово!',
  '🧼 Почистив-підшаманив — готово!',
  '🧙‍♂️ Трішки магії — і все як новеньке!',
  '🖊️ Готово! Запис не впізнати 😉',
  '🔧 Внесено зміни. Нотатка стала ще кращою!'
];

const loadingMessages = [
  '🔧 Вношу зміни...',
  '🖊️ Переоформлюю нотатку...',
  '🧹 Шліфую дату і нотатку...',
  '✏️ Переписую красиво...',
  '💭 Думаю, як зробити краще...',
  '🕐 Оновлюю запис у базі...'
];

const editReminder = new Scenes.WizardScene(
  'editReminder',

  (ctx) => {
    const reminders = loadUserReminders(ctx.from.id);
    const index = ctx.session.editingIndex;

    if (!reminders[index]) {
      ctx.reply('⚠️ Нагадування не знайдено.', mainMenuKeyboard);
      return ctx.scene.leave();
    }

    ctx.session.reminders = reminders;

    ctx.reply(
      '✏️ Введи нову дату (наприклад, 25.07.1995):',
      {
        reply_markup: {
          remove_keyboard: true
        }
      }
    );

    return ctx.wizard.next();
  },

  (ctx) => {
    if (ctx.callbackQuery?.data === 'skip_date') {
      ctx.session.skipDate = true;
      ctx.answerCbQuery();
      ctx.reply(
        '📝 Введи нову нотатку (або залиш порожньо):',
        Markup.inlineKeyboard([
          [Markup.button.callback('⏭ Пропустити', 'skip_note')],
          [Markup.button.callback('❌ Скасувати', 'cancel_edit')]
        ])
      );
      return ctx.wizard.next();
    }

    if (ctx.callbackQuery?.data === 'cancel_edit') {
      ctx.answerCbQuery();
      ctx.reply('❌ Редагування скасовано.', mainMenuKeyboard);
      return ctx.scene.leave();
    }

    if (!ctx.message || !ctx.message.text || !/^\d{1,2}[./\-\s]\d{1,2}([./\-\s]\d{2,4})?$/.test(ctx.message.text.trim())) {
      return ctx.reply('⚠️ Некоректна дата. Приклад: 25.07.1995');
    }

    ctx.session.newDate = ctx.message.text.trim();

    ctx.reply(
      '📝 Введи нову нотатку (або залиш порожньо):',
      Markup.inlineKeyboard([
        [Markup.button.callback('⏭ Пропустити', 'skip_note')],
        [Markup.button.callback('❌ Скасувати', 'cancel_edit')]
      ])
    );
    return ctx.wizard.next();
  },

  async (ctx) => {
    if (ctx.callbackQuery?.data === 'skip_note') {
      ctx.session.skipNote = true;
      ctx.answerCbQuery();
    } else if (ctx.callbackQuery?.data === 'cancel_edit') {
      ctx.answerCbQuery();
      ctx.reply('❌ Редагування скасовано.', mainMenuKeyboard);
      return ctx.scene.leave();
    } else if (ctx.message && ctx.message.text) {
      ctx.session.newNote = ctx.message.text.trim();
    }

    const reminders = ctx.session.reminders;
    const index = ctx.session.editingIndex;
    let updated = false;

    if (!ctx.session.skipDate && ctx.session.newDate) {
      reminders[index].date = ctx.session.newDate;
      updated = true;
    }

    if (!ctx.session.skipNote && typeof ctx.session.newNote === 'string') {
      reminders[index].note = ctx.session.newNote;
      updated = true;
    }

    saveUserReminders(ctx.from.id, reminders);

    const loadingText = loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
    const msg = await ctx.reply(loadingText);

    setTimeout(() => {
      const finalText = updated
        ? editSuccessMessages[Math.floor(Math.random() * editSuccessMessages.length)]
        : 'ℹ️ Нічого не змінено.';

      ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, finalText);
      ctx.reply('🔽 Головне меню:', mainMenuKeyboard);
    }, 1500);

    return ctx.scene.leave();
  }
);

module.exports = editReminder;
