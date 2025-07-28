const { Scenes, Markup } = require('telegraf');
const { loadUserReminders, saveUserReminders } = require('./userStorage');

const addReminder = new Scenes.WizardScene(
  'addReminder',

  async (ctx) => {
    ctx.reply('Введи дату у форматі: 25.07.1996 або 1/1/95');
    return ctx.wizard.next();
  },

  async (ctx) => {
    if (!ctx.message || !ctx.message.text) {
      return ctx.reply('⚠️ Надішли, будь ласка, дату текстом.');
    }

    const rawDate = ctx.message.text.trim();
    const dateRegex = /^\d{1,2}[./\-\s]\d{1,2}([./\-\s]\d{2,4})?$/;

    if (!dateRegex.test(rawDate)) {
      return ctx.reply(
        '❌ Дата не збережена. Допустимі формати: 25.07.1995, 1/1/95, 10-12-2000.\nБудь ласка, введи ще раз.'
      );
    }

    const [day, month, yearPart] = rawDate.split(/[./\-\s]/);
    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    let yearNum = parseInt(yearPart);
    if (yearPart?.length === 2) {
      const currentYear = new Date().getFullYear() % 100;
      const century = yearNum > currentYear ? 1900 : 2000;
      yearNum += century;
    }

    const dateObj = new Date(yearNum, monthNum - 1, dayNum);
    if (
      dateObj.getDate() !== dayNum ||
      dateObj.getMonth() + 1 !== monthNum ||
      dateObj.getFullYear() !== yearNum
    ) {
      return ctx.reply(
        '❌ Невірна дата. Наприклад, 31.11.2000 — це неіснуючий день. Спробуй ще раз.'
      );
    }

    ctx.wizard.state.date = rawDate;

    ctx.reply(
      '📝 Введи нотатку (імʼя, подія, тощо)',
      Markup.inlineKeyboard([
        [Markup.button.callback('⏭ Пропустити і зберегти', 'skip_note')]
      ])
    );
    return ctx.wizard.next();
  },

  async (ctx) => {
    const { date } = ctx.wizard.state;

    if (ctx.callbackQuery?.data === 'skip_note') {
      ctx.answerCbQuery();
      const reminders = loadUserReminders(ctx.from.id);
      reminders.push({ date, note: '' });
      saveUserReminders(ctx.from.id, reminders);
      ctx.reply(`✅ Додано нагадування без нотатки на ${date}`);
      return ctx.scene.leave();
    }

    if (!ctx.message || !ctx.message.text) {
      return ctx.reply('⚠️ Надішли нотатку текстом або натисни "Пропустити і зберегти".');
    }

    const note = ctx.message.text.trim();
    const reminders = loadUserReminders(ctx.from.id);
    reminders.push({ date, note });
    saveUserReminders(ctx.from.id, reminders);
    ctx.reply(`✅ Додано нагадування: ${note || '(без нотатки)'} на ${date}`);
    return ctx.scene.leave();
  }
);

module.exports = addReminder;
