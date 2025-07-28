const { Scenes, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');

const dataDir = './data'; // Твоя папка з даними
const getUserFilePath = (userId) => path.join(dataDir, `${userId}.json`);

const loadReminders = (userId) =>
  fs.existsSync(getUserFilePath(userId))
    ? JSON.parse(fs.readFileSync(getUserFilePath(userId)))
    : [];

const saveReminders = (userId, data) =>
  fs.writeFileSync(getUserFilePath(userId), JSON.stringify(data, null, 2));

const editReminder = new Scenes.WizardScene(
  'editReminder',

  // Крок 0 - Показати меню редагування (опції, які не вибрані зараз)
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
    ctx.scene.state.editing = null;

    await showEditMenu(ctx);
  },

  // Крок 1 - Обробка вибору в меню редагування
  async (ctx) => {
    const text = ctx.message?.text;
    if (!text) {
      await ctx.reply('⚠️ Будь ласка, обери дію з меню.');
      return;
    }

    if (text === '❌ Скасувати') {
      await ctx.reply('Редагування скасовано.', Markup.removeKeyboard());
      return ctx.scene.leave();
    }

    if (text === '💾 Зберегти й вийти') {
      await saveChanges(ctx);
      return ctx.scene.leave();
    }

    // Встановлюємо поточний режим редагування і переходимо на відповідний крок
    if (text === '🗓 Змінити дату') {
      ctx.scene.state.editing = 'date';
      await ctx.reply(
        'Введи нову дату у форматі: 25.07.1996 або 1/1/95 або /cancel для скасування',
        Markup.removeKeyboard()
      );
      return ctx.wizard.next();
    }

    if (text === '📝 Змінити нотатку') {
      ctx.scene.state.editing = 'note';
      await ctx.reply('Введи нову нотатку або /cancel для скасування', Markup.removeKeyboard());
      return ctx.wizard.next();
    }

    if (text === '⏰ Змінити нагадування (дні)') {
      ctx.scene.state.editing = 'remindBefore';
      await showRemindBeforeButtons(ctx);
      return ctx.wizard.selectStep(3); // Йдемо на крок 3
    }

    await ctx.reply('⚠️ Обери одну з доступних опцій.');
  },

  // Крок 2 - Введення нової дати або нотатки
  async (ctx) => {
    const text = ctx.message?.text;

    if (text === '/cancel') {
      ctx.scene.state.editing = null;
      await ctx.reply('Редагування скасовано. Повертаємось у меню редагування.', Markup.removeKeyboard());
      await showEditMenu(ctx);
      return ctx.wizard.selectStep(1);
    }

    if (ctx.scene.state.editing === 'date') {
      const rawDate = text?.trim();
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
      ctx.scene.state.editing = null;
      await ctx.reply(`Дата змінена на: ${rawDate}`);
      await showEditMenu(ctx);
      return ctx.wizard.selectStep(1);
    }

    if (ctx.scene.state.editing === 'note') {
      const note = text?.trim();
      ctx.scene.state.reminder.note = note || '';
      ctx.scene.state.editing = null;
      await ctx.reply(`Нотатку змінено на: ${ctx.scene.state.reminder.note || '(порожня)'}`);
      await showEditMenu(ctx);
      return ctx.wizard.selectStep(1);
    }
  },

  // Крок 3 - Редагування remindBefore (toggle кнопки)
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
      ctx.scene.state.editing = null;
      await ctx.reply('🔖 Нагадування оновлено.');
      await showEditMenu(ctx);
      return ctx.wizard.selectStep(1);
    }

    if (data === 'cancel_edit') {
      ctx.scene.state.editing = null;
      await ctx.reply('Редагування скасовано.');
      await showEditMenu(ctx);
      return ctx.wizard.selectStep(1);
    }
  }
);

async function showEditMenu(ctx) {
  const editing = ctx.scene.state.editing;
  const reminder = ctx.scene.state.reminder;

  const buttons = [];

  if (editing !== 'date') buttons.push('🗓 Змінити дату');
  if (editing !== 'note') buttons.push('📝 Змінити нотатку');
  if (editing !== 'remindBefore') buttons.push('⏰ Змінити нагадування (дні)');
  buttons.push('💾 Зберегти й вийти');
  buttons.push('❌ Скасувати');

  const text = `Редагуємо нагадування:\n📅 ${reminder.date}${reminder.note ? ` — ${reminder.note}` : ''}\n\nЩо хочеш змінити?`;

  if (ctx.updateType === 'callback_query' || ctx.callbackQuery) {
    try {
      await ctx.editMessageText(text, Markup.keyboard(buttons).resize());
    } catch {
      // Якщо редагувати не вдається, надсилаємо нове повідомлення
      await ctx.reply(text, Markup.keyboard(buttons).resize());
    }
  } else {
    await ctx.reply(text, Markup.keyboard(buttons).resize());
  }
}

async function showRemindBeforeButtons(ctx) {
  const selected = ctx.scene.state.selectedRemindBefore;

  if (ctx.callbackQuery) {
    try {
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
    } catch {
      await ctx.reply(
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
  } else {
    await ctx.reply(
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

  await ctx.reply('✅ Всі зміни збережено.', Markup.removeKeyboard());
}

module.exports = editReminder;
