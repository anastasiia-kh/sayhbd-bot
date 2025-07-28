const { Scenes, Markup } = require('telegraf');
const { loadUserReminders, saveUserReminders } = require('./userStorage');

const mainMenuKeyboard = Markup.keyboard([
  ['➕ Додати нагадування'],
  ['📋 Список нагадувань'],
  ['ℹ️ Допомога']
]).resize();

const reminderOptions = [
  { label: 'У день події', value: 0 },
  { label: 'За 1 день', value: 1 },
  { label: 'За 3 дні', value: 3 },
  { label: 'За 7 днів', value: 7 }
];

const addReminder = new Scenes.WizardScene(
  'addReminder',

  async (ctx) => {
    ctx.reply('Введи дату у форматі: 25.07.1996 або 1/1/95', {
      reply_markup: {
        remove_keyboard: true
      }
    });
    return ctx.wizard.next();
  },

  async (ctx) => {
    if (!ctx.message || !ctx.message.text) {
      return ctx.reply('⚠️ Надішли, будь ласка, дату текстом.');
    }

    const rawDate = ctx.message.text.trim();
    const dateRegex = /^\d{1,2}[./\-\s]\d{1,2}([./\-\s]\d{2,4})?$/;

    if (!dateRegex.test(rawDate)) {
      return ctx.reply('❌ Невірна дата. Приклад: 25.07.1995');
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
      return ctx.reply('❌ Невірна дата. Спробуй ще раз.');
    }

    ctx.wizard.state.date = rawDate;
    await ctx.reply(
  '📝 Введи нотатку (імʼя, подія, тощо)',
  Markup.inlineKeyboard([
    [Markup.button.callback('⏭ Пропустити', 'skip_note')]
  ])
);
return ctx.wizard.next();

  },

  async (ctx) => {
    if (ctx.callbackQuery?.data === 'skip_note') {
  ctx.wizard.state.note = '';
  await ctx.answerCbQuery('⏭ Нотатку пропущено');
} else if (ctx.message?.text) {
  ctx.wizard.state.note = ctx.message.text.trim();
} else {
  return ctx.reply('⚠️ Надішли нотатку текстом або натисни “Пропустити”.');
}

    ctx.wizard.state.remindBefore = [];

    const buttons = reminderOptions.map((opt) =>
      Markup.button.callback(opt.label, `toggle_${opt.value}`)
    );

    ctx.reply(
      '🕐 Коли надіслати нагадування? Обери один або кілька варіантів:',
      Markup.inlineKeyboard([
        [buttons[0], buttons[1]],
        [buttons[2], buttons[3]],
        [Markup.button.callback('✅ Готово', 'done')]
      ])
    );

    return ctx.wizard.next();
  },

  async (ctx) => {
    const data = ctx.callbackQuery?.data;
    const state = ctx.wizard.state;

    if (!data) return;

    if (data.startsWith('toggle_')) {
      const value = parseInt(data.replace('toggle_', ''));
      const idx = state.remindBefore.indexOf(value);
      if (idx === -1) {
        state.remindBefore.push(value);
      } else {
        state.remindBefore.splice(idx, 1);
      }

      ctx.answerCbQuery(
        state.remindBefore.includes(value)
          ? `✅ Додано: ${value === 0 ? 'У день події' : `За ${value} днів`}`
          : `❌ Видалено: ${value === 0 ? 'У день події' : `За ${value} днів`}`
      );
    }

    if (data === 'done') {
      if (!state.remindBefore.length) {
        return ctx.answerCbQuery('⚠️ Обери хоча б один варіант!');
      }

      const reminders = loadUserReminders(ctx.from.id);
      reminders.push({
        date: state.date,
        note: state.note,
        remindBefore: state.remindBefore.sort((a, b) => a - b)
      });
      saveUserReminders(ctx.from.id, reminders);

      await ctx.reply('✅ Нагадування збережено!', mainMenuKeyboard);
      return ctx.scene.leave();
    }
  }
);

module.exports = addReminder;
