const { Scenes, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');

const dataDir = './userData';
const getUserFilePath = (userId) => path.join(dataDir, `${userId}.json`);
const loadReminders = (userId) => {
  const file = getUserFilePath(userId);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : [];
};
const saveReminders = (userId, data) => {
  fs.writeFileSync(getUserFilePath(userId), JSON.stringify(data, null, 2));
};

const editReminderScene = new Scenes.WizardScene(
  'editReminder',
  (ctx) => {
    ctx.wizard.state.reminders = loadReminders(ctx.from.id);
    const index = ctx.session.editingIndex;
    if (!ctx.wizard.state.reminders[index]) {
      ctx.reply('❌ Нагадування не знайдено.');
      return ctx.scene.leave();
    }
    ctx.reply('✏️ Введи нову дату (наприклад, 25.07.1995):');
    return ctx.wizard.next();
  },
  (ctx) => {
    const date = ctx.message.text.trim();
    ctx.wizard.state.newDate = date;
    ctx.reply('📝 Введи нову нотатку (або залиш порожньо):');
    return ctx.wizard.next();
  },
  (ctx) => {
    const note = ctx.message.text.trim();
    const index = ctx.session.editingIndex;
    const reminders = ctx.wizard.state.reminders;

    const old = reminders[index];
    const newReminder = {
      date: ctx.wizard.state.newDate || old.date,
      note: note || old.note
    };

    if (newReminder.date === old.date && newReminder.note === old.note) {
      ctx.reply('ℹ️ Нічого не змінено.');
    } else {
      reminders[index] = newReminder;
      saveReminders(ctx.from.id, reminders);
      ctx.reply('✅ Нагадування оновлено!');
    }

    return ctx.scene.leave();
  }
);

module.exports = editReminderScene;
