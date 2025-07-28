const { Scenes, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');

const dataDir = './data'; // Шлях до твоєї папки з даними
const getUserFilePath = (userId) => path.join(dataDir, `${userId}.json`);

const loadReminders = (userId) =>
  fs.existsSync(getUserFilePath(userId))
    ? JSON.parse(fs.readFileSync(getUserFilePath(userId)))
    : [];

const saveReminders = (userId, data) =>
  fs.writeFileSync(getUserFilePath(userId), JSON.stringify(data, null, 2));

const editReminder = new Scenes.WizardScene(
  'editReminder',

  // Крок 0 - Меню вибору дії
  async (ctx) => {
    const reminders = ctx.scene.state.allReminders || loadReminders(ctx.from.id);
    const editId = ctx.scene.state.editId;
    const reminder = reminders.find(r => r.id === editId);

    if (!reminder) {
      await ctx.reply('⚠️ Не вдалося знайти нагадування.');
      return ctx.scene.leave();
    }

    ctx.scene.state.reminder = { ...reminder };
    ctx.scene.state.selectedRemindBefore = new Set(reminder.remindBefore || []);

    await ctx.reply(
      `Редагуємо нагадування:\n📅 ${reminder.date}${reminder.note ? ` — ${reminder.note}` : ''}\n\nЩо хочеш змінити?`,
      Markup.keyboard([
        ['🗓 Змінити дату'],
        ['📝 Змінити нотатку'],
        ['⏰ Змінити нагадування (дні)'],
        ['💾 Зберегти й вийти'],
        ['❌ Скасувати']
      ]).resize()
    );

    return ctx.wizard.next();
  },

  // Крок 1 - Обробка вибору користувача
  async (ctx) => {
    const text = ctx.message?.text;
    if (!text) return ctx.reply('⚠️ Обери дію з меню.');

    switch (text) {
      case '🗓 Змінити дату':
        await ctx.reply('Введи нову дату у форматі: 25.07.1996 або 1/1/95 або /cancel для скасування');
        ctx.scene.state.step = 'editDate';
        break;

      case '📝 Змінити нотатку':
        await ctx.reply('Введи нову нотатку або /cancel для скасування');
        ctx.scene.state.step = 'editNote';
        break;

      case '⏰ Змінити нагадування (дні)':
  ctx.scene.state.step = 'editRemindBefore';
  if (ctx.callbackQuery) {
    await showRemindBeforeButtons(ctx);
  } else {
    // Якщо це текстове повідомлення, відправляємо нове повідомлення з кнопками
    await ctx.reply(
      `Оберіть, коли нагадати:\n(натискай щоб додати/видалити)`,
      Markup.inlineKeyboard([
        [0,1,3,7].map(d => Markup.button.callback(ctx.scene.state.selectedRemindBefore.has(d) ? `✅ ${d} дн.` : `${d} дн.`, `toggle_${d}`)),
        [
          Markup.button.callback('💾 Зберегти', 'save_edit'),
          Markup.button.callback('❌ Скасувати', 'cancel_edit')
        ]
      ])
    );
  }
  break;


      case '💾 Зберегти й вийти':
        await saveChanges(ctx);
        return ctx.scene.leave();

      case '❌ Скасувати':
        await ctx.reply('Редагування скасовано.', Markup.removeKeyboard());
        return ctx.scene.leave();

      default:
        await ctx.reply('Будь ласка, обери одну з доступних опцій.');
    }

    if (ctx.scene.state.step === 'editDate' || ctx.scene.state.step === 'editNote') {
      return ctx.wizard.next();
    }
  },

  // Крок 2 - Введення нової дати або нотатки
  async (ctx) => {
    if (ctx.message?.text === '/cancel') {
      await ctx.reply('Редагування скасовано. Повертаємося в меню.', mainMenuKeyboard());
      ctx.scene.state.step = null;
      return ctx.wizard.selectStep(0);
    }

    if (ctx.scene.state.step === 'editDate') {
      const rawDate = ctx.message?.text.trim();
      const dateRegex = /^\d{1,2}[./\-\s]\d{1,2}[./\-\s]\d{2,4}$/;

      if (!rawDate || !dateRegex.test(rawDate)) {
        return ctx.reply('❌ Невірна дата. Спробуй ще раз або введи /cancel.');
      }

      const [day, month, yearPart] = rawDate.split(/[./\-\s]/);
      const dayNum = Number(day);
      const monthNum = Number(month);
      let yearNum = Number(yearPart);

      if (yearPart.length === 2) {
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
        return ctx.reply('❌ Невірна дата. Спробуй ще раз або введи /cancel.');
      }

      ctx.scene.state.reminder.date = rawDate;
      await ctx.reply(`Дата змінена на: ${rawDate}`);
      return ctx.wizard.selectStep(0);
    }

    if (ctx.scene.state.step === 'editNote') {
      const note = ctx.message?.text.trim();
      ctx.scene.state.reminder.note = note || '';
      await ctx.reply(`Нотатку змінено на: ${ctx.scene.state.reminder.note || '(порожня)'}`);
      return ctx.wizard.selectStep(0);
    }
  },

  // Крок 3 - Редагування remindBefore через inline кнопки
  async (ctx) => {
    const data = ctx.callbackQuery?.data;
    if (!data) return;

    if (data.startsWith('toggle_')) {
      const day = Number(data.split('_')[1]);
      const selected = ctx.scene.state.selectedRemindBefore;

      if (selected.has(day)) {
        selected.delete(day);
      } else {
        selected.add(day);
      }

      await showRemindBeforeButtons(ctx);
      await ctx.answerCbQuery();
      return;
    }

    if (data === 'save_edit') {
      ctx.scene.state.reminder.remindBefore = Array.from(ctx.scene.state.selectedRemindBefore).sort((a,b) => a-b);

      await ctx.reply('🔖 Зміни збережено.', mainMenuKeyboard());
      return ctx.scene.leave();
    }

    if (data === 'cancel_edit') {
      await ctx.reply('Редагування скасовано.', mainMenuKeyboard());
      return ctx.scene.leave();
    }
  }
);

function mainMenuKeyboard() {
  return Markup.keyboard([
    ['➕ Додати нагадування'],
    ['📋 Список нагадувань'],
    ['ℹ️ Допомога']
  ]).resize();
}

async function showRemindBeforeButtons(ctx) {
  const selected = ctx.scene.state.selectedRemindBefore;

  if (!ctx.callbackQuery) {
    // Відправляємо нове повідомлення з кнопками
    return ctx.reply(
      `Оберіть, коли нагадати:\n(натискай щоб додати/видалити)`,
      Markup.inlineKeyboard([
        [0,1,3,7].map(d => Markup.button.callback(selected.has(d) ? `✅ ${d} дн.` : `${d} дн.`, `toggle_${d}`)),
        [
          Markup.button.callback('💾 Зберегти', 'save_edit'),
          Markup.button.callback('❌ Скасувати', 'cancel_edit')
        ]
      ])
    );
  }

  // Якщо це callbackQuery — редагуємо наявне повідомлення
  await ctx.editMessageText(
    `Оберіть, коли нагадати:\n(натискай щоб додати/видалити)`,
    Markup.inlineKeyboard([
      [0,1,3,7].map(d => Markup.button.callback(selected.has(d) ? `✅ ${d} дн.` : `${d} дн.`, `toggle_${d}`)),
      [
        Markup.button.callback('💾 Зберегти', 'save_edit'),
        Markup.button.callback('❌ Скасувати', 'cancel_edit')
      ]
    ])
  );
}


async function saveChanges(ctx) {
  const userId = ctx.from.id;
  const reminders = loadReminders(userId);
  const reminderIndex = reminders.findIndex(r => r.id === ctx.scene.state.editId);

  if (reminderIndex === -1) {
    await ctx.reply('⚠️ Нагадування вже не існує.');
    return;
  }

  reminders[reminderIndex] = ctx.scene.state.reminder;
  saveReminders(userId, reminders);

  await ctx.reply('✅ Всі зміни збережено.');
}

module.exports = editReminder;
