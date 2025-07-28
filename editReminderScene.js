const { Scenes, Markup } = require('telegraf');
const { loadUserReminders, saveUserReminders } = require('./userStorage');

const editReminder = new Scenes.WizardScene(
  'editReminder',

  (ctx) => {
    const reminders = loadUserReminders(ctx.from.id);
    const index = ctx.session.editingIndex;

    if (!reminders[index]) {
      ctx.reply('⚠️ Нагадування не знайдено.');
      return ctx.scene.leave();
    }

    ctx.session.reminders = reminders;

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
      ctx.reply('❌ Редагування скасовано.');
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

  (ctx) => {
    if (ctx.callbackQuery?.data === 'skip_note') {
      ctx.session.skipNote = true;
      ctx.answerCbQuery();
    } else if (ctx.callbackQuery?.data === 'cancel_edit') {
      ctx.answerCbQuery();
      ctx.reply('❌ Редагування скасовано.');
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

    ctx.reply(updated ? '✅ Нагадування оновлено!' : 'ℹ️ Нічого не змінено.');
    return ctx.scene.leave();
  }
);

module.exports = editReminder;
