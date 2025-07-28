const { Scenes } = require('telegraf');
const { loadUserReminders, saveUserReminders } = require('./userStorage');

const addReminder = new Scenes.WizardScene(
  'addReminder',

  async (ctx) => {
    ctx.reply('Введи дату у форматі: 25.07.1996 або 25 липня 1996');
    return ctx.wizard.next();
  },

  async (ctx) => {
    if (!ctx.message || !ctx.message.text) {
      return ctx.reply('⚠️ Надішли, будь ласка, дату текстом.');
    }
    ctx.wizard.state.date = ctx.message.text.trim();
    ctx.reply('Тепер введи нотатку (імʼя, подія, тощо)');
    return ctx.wizard.next();
  },

  async (ctx) => {
    if (!ctx.message || !ctx.message.text) {
      return ctx.reply('⚠️ Надішли, будь ласка, нотатку текстом.');
    }

    const note = ctx.message.text.trim();
    const { date } = ctx.wizard.state;
    const reminders = loadUserReminders(ctx.from.id);

    reminders.push({ date, note });
    saveUserReminders(ctx.from.id, reminders);

    ctx.reply(`✅ Додано нагадування: ${note} на ${date}`);
    return ctx.scene.leave();
  }
);

module.exports = addReminder;
