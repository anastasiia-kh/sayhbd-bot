const { Scenes } = require('telegraf');
const fs = require('fs');
const path = require('path');

const dataDir = './userData';
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const getUserFilePath = (userId) => path.join(dataDir, `${userId}.json`);
const loadReminders = (userId) => {
  const file = getUserFilePath(userId);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : [];
};
const saveReminders = (userId, data) => {
  fs.writeFileSync(getUserFilePath(userId), JSON.stringify(data, null, 2));
};

const addReminder = new Scenes.WizardScene(
  'addReminder',
  async (ctx) => {
    ctx.reply('Введи дату у форматі: 25.07.1996 або 25 липня 1996');
    return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.wizard.state.date = ctx.message.text.trim();
    ctx.reply('Тепер введи нотатку (імʼя, подія, тощо)');
    return ctx.wizard.next();
  },
  async (ctx) => {
    const note = ctx.message.text.trim();
    const { date } = ctx.wizard.state;
    const reminders = loadReminders(ctx.from.id);
    reminders.push({ date, note });
    saveReminders(ctx.from.id, reminders);
    ctx.reply(`✅ Додано нагадування: ${note} на ${date}`);
    return ctx.scene.leave();
  }
);

module.exports = addReminder;
