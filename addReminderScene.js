const { Scenes, Markup } = require('telegraf');
const { loadUserReminders, saveUserReminders } = require('./userStorage');

const mainMenuKeyboard = Markup.keyboard([
  ['➕ Додати нагадування'],
  ['📋 Список нагадувань'],
  ['ℹ️ Допомога']
]).resize();

const funnyDateErrors = [
  '❌ Дата виглядає як рецепт бабусі, а не календар. Спробуй ще раз, наприклад: 25.07.1995',
  '📅 Я, звісно, бот, але 99.99.9999 навіть мене лякає. Спробуй формат: 1/1/95',
  '😅 Це не дата, це телепорт у паралельний вимір. Напиши щось типу: 1/1/95',
  '🧐 Ні, це не дата. Це щось… дуже сміливе. Краще: 10-12-2000',
  '❌ Таку дату я навіть у серіалі "Темрява" не бачив. Формат має бути: 25.07.1995',
  '⛔️ Ні-ні, я не можу це зберегти. Мені потрібна дата у форматі: 25.07.1995 або подібному',
  '📆 Це більше схоже на номер поштового індексу. Спробуй так: 25.07.1995',
  '🛸 Це що, координати прибульців? Мені потрібна дата, наприклад: 01.01.2000',
  '📜 Я не архівіст. Формат дати має бути простим: 25.07.1995',
  '🕳️ Я не зміг знайти цю дату навіть у календарі майя. Введи щось на кшталт: 10-12-2000'
];

const loadingMessages = [
  '📦 Зберігаю нагадування...',
  '🧠 Думаю над цим...',
  '✨ Упаковую в мозок...',
  '🕐 Записую в секретний щоденник...',
  '🔮 Заклинаю бота памʼятати...',
  '📋 Вирізаю з паперу і вклеюю...'
];

const successMessages = [
  '✅ Додано! Надійно записано між рядками коду 🤖',
  '📌 Готово! Я це запам’ятаю краще, ніж свій день народження',
  '🧠 Записано в мою вічну памʼять!',
  '💾 Збережено. Тепер точно не забудемо!',
  '🪄 Магія збереження завершена. Дата: {date}',
  '✅ Є контакт! {note} на {date}',
  '📎 Твоє нагадування — під скріпку і в архів 📁',
  '🎯 Зафіксовано! Буду пінгувати у потрібний день 📅',
  '📅 Занотовано: {note} — {date}',
  '📝 Тихенько записав... ніхто не дізнається 😉'
];

const pickSuccessMessage = (note, date) => {
  const withNote = successMessages.filter((msg) => msg.includes('{note}'));
  const withoutNote = successMessages.filter((msg) => !msg.includes('{note}'));

  const pool = note ? withNote : withoutNote;
  const template = pool[Math.floor(Math.random() * pool.length)];

  return template
    .replace('{note}', note)
    .replace('{date}', date);
};

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
      const randomError = funnyDateErrors[Math.floor(Math.random() * funnyDateErrors.length)];
      return ctx.reply(randomError);
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

    const showSuccess = async (text) => {
      const msgText = loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
      const msg = await ctx.reply(msgText);
      setTimeout(async () => {
        await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, text);
        await ctx.reply('🔽 Головне меню:', mainMenuKeyboard);
      }, 1500);
    };

    if (ctx.callbackQuery?.data === 'skip_note') {
      ctx.answerCbQuery();
      const reminders = loadUserReminders(ctx.from.id);
      reminders.push({ date, note: '' });
      saveUserReminders(ctx.from.id, reminders);

      await showSuccess(pickSuccessMessage(null, date));
      return ctx.scene.leave();
    }

    if (!ctx.message || !ctx.message.text) {
      return ctx.reply('⚠️ Надішли нотатку текстом або натисни "Пропустити і зберегти".');
    }

    const note = ctx.message.text.trim();
    const reminders = loadUserReminders(ctx.from.id);
    reminders.push({ date, note });
    saveUserReminders(ctx.from.id, reminders);

    await showSuccess(pickSuccessMessage(note, date));
    return ctx.scene.leave();
  }
);

module.exports = addReminder;
