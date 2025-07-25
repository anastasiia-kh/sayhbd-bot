const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const { schedule } = require('node-cron');

const token = '7520027372:AAG6I_xS7O8adDg83Nue6zb8gNljDFVWMe4'; // Встав свій токен сюди
const bot = new TelegramBot(token, { polling: true });

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const dateRegex = /^(\d{2})[./-](\d{2})[./-](\d{2}|\d{4})$/;

function normalizeYear(yearStr) {
  let yearNum = Number(yearStr);
  if (yearStr.length === 2) {
    yearNum = yearNum > 30 ? 1900 + yearNum : 2000 + yearNum;
  }
  return yearNum;
}

function parseDate(dateStr) {
  const match = dateStr.match(dateRegex);
  if (!match) return null;
  const day = match[1];
  const month = match[2];
  const year = normalizeYear(match[3]);
  return `${day}-${month}-${year}`;
}

function getUserFilePath(userId) {
  return path.join(dataDir, `${userId}.json`);
}

function loadReminders(userId) {
  const filePath = getUserFilePath(userId);
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath);
    return JSON.parse(data);
  }
  return [];
}

function saveReminders(userId, reminders) {
  const filePath = getUserFilePath(userId);
  fs.writeFileSync(filePath, JSON.stringify(reminders, null, 2));
}

function calculateAge(birthdate) {
  const [day, month, year] = birthdate.split('-').map(Number);
  if (!year) return null;
  const today = new Date();
  let age = today.getFullYear() - year;
  const hasHadBirthday =
    today.getMonth() + 1 > month ||
    (today.getMonth() + 1 === month && today.getDate() >= day);
  if (!hasHadBirthday) age--;
  return age < 0 ? 0 : age;
}

const mainKeyboard = {
  reply_markup: {
    keyboard: [
      ['➕ Add Reminder', '📋 View Reminders'],
      ['✏️ Edit Reminder', '🗑️ Delete Reminder'],
      ['ℹ️ Help'],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  },
};

// /start
bot.onText(/\/start/, (msg) => {
  const userId = msg.chat.id;
  const welcomeMessage = `Hi! Send:

/add DD-MM-YYYY Your note

to add a birthday reminder 🎉

Use buttons below for actions.`;
  bot.sendMessage(userId, welcomeMessage, mainKeyboard);
});

// Help
bot.onText(/ℹ️ Help/, (msg) => {
  const helpText = `Welcome to SayHBDbot!

Commands:
/add DD-MM-YYYY Your note — Add a birthday reminder
📋 View Reminders — Show your saved reminders
✏️ Edit Reminder — Edit an existing reminder
🗑️ Delete Reminder — Delete a reminder
ℹ️ Help — Show this help message

Date formats supported:
DD-MM-YYYY, DD-MM-YY,
DD/MM/YYYY, DD/MM/YY,
DD.MM.YYYY, DD.MM.YY
`;
  bot.sendMessage(msg.chat.id, helpText, mainKeyboard);
});

// Add reminder command
bot.onText(/\/add (.+)/, (msg, match) => {
  const userId = msg.chat.id.toString();
  const input = match[1];
  const splitIndex = input.indexOf(' ');
  if (splitIndex === -1) {
    bot.sendMessage(userId, 'Please use format: /add DD-MM-YYYY Your note');
    return;
  }
  const dateRaw = input.substring(0, splitIndex);
  const note = input.substring(splitIndex + 1).trim();

  if (!dateRegex.test(dateRaw)) {
    bot.sendMessage(userId, 'Invalid date format. Use one of supported formats.');
    return;
  }

  const parsedDate = parseDate(dateRaw);
  if (!parsedDate) {
    bot.sendMessage(userId, 'Invalid date after parsing. Check input.');
    return;
  }

  const reminders = loadReminders(userId);
  reminders.push({ date: parsedDate, note });
  saveReminders(userId, reminders);

  bot.sendMessage(userId, `✅ Reminder saved for ${parsedDate}!`);
});

bot.onText(/➕ Add Reminder/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Send command like:\n/add DD-MM-YYYY Your note', mainKeyboard);
});

// View reminders button
bot.onText(/📋 View Reminders/, (msg) => {
  const userId = msg.chat.id.toString();
  let reminders = loadReminders(userId);
  if (reminders.length === 0) {
    bot.sendMessage(userId, 'You have no saved reminders.', mainKeyboard);
    return;
  }
  reminders = reminders.sort((a, b) => {
    const [ad, am, ay] = a.date.split('-').map(Number);
    const [bd, bm, by] = b.date.split('-').map(Number);
    return new Date(ay, am - 1, ad) - new Date(by, bm - 1, bd);
  });
  let text = 'Your saved reminders:\n\n';
  reminders.forEach((r, i) => {
    text += `${i + 1}. ${r.date} — ${r.note}\n`;
  });
  bot.sendMessage(userId, text, mainKeyboard);
});

// Inline keyboard helpers for Edit and Delete menus
function createInlineKeyboard(reminders, prefix) {
  return {
    reply_markup: {
      inline_keyboard: reminders.map((r, i) => [
        {
          text: `${r.date} — ${r.note}`,
          callback_data: `${prefix}_${i}`,
        },
      ]),
    },
  };
}

// Edit Reminder button — shows inline keyboard to pick which to edit
bot.onText(/✏️ Edit Reminder/, (msg) => {
  const userId = msg.chat.id.toString();
  const reminders = loadReminders(userId);
  if (reminders.length === 0) {
    bot.sendMessage(userId, 'Nothing to edit.', mainKeyboard);
    return;
  }
  bot.sendMessage(userId, 'Select a reminder to edit:', createInlineKeyboard(reminders, 'edit'));
});

// Delete Reminder button — shows inline keyboard to pick which to delete
bot.onText(/🗑️ Delete Reminder/, (msg) => {
  const userId = msg.chat.id.toString();
  const reminders = loadReminders(userId);
  if (reminders.length === 0) {
    bot.sendMessage(userId, 'Nothing to delete.', mainKeyboard);
    return;
  }
  bot.sendMessage(userId, 'Select a reminder to delete:', createInlineKeyboard(reminders, 'del'));
});

// Handle inline callback queries for edit and delete
bot.on('callback_query', (query) => {
  const userId = query.message.chat.id.toString();
  const reminders = loadReminders(userId);
  const data = query.data;

  if (data.startsWith('edit_')) {
    const index = parseInt(data.split('_')[1]);
    if (isNaN(index) || !reminders[index]) {
      bot.answerCallbackQuery(query.id, { text: 'Invalid selection.' });
      return;
    }
    bot.answerCallbackQuery(query.id);
    bot.sendMessage(userId, `Send new note text for reminder dated ${reminders[index].date}:`);

    // Next message from user will be new note text
    const listener = (msg) => {
      if (msg.chat.id.toString() === userId) {
        reminders[index].note = msg.text;
        saveReminders(userId, reminders);
        bot.sendMessage(userId, '✅ Reminder updated.', mainKeyboard);
        bot.removeListener('message', listener);
      }
    };
    bot.on('message', listener);
  } else if (data.startsWith('del_')) {
    const index = parseInt(data.split('_')[1]);
    if (isNaN(index) || !reminders[index]) {
      bot.answerCallbackQuery(query.id, { text: 'Invalid selection.' });
      return;
    }
    const removed = reminders.splice(index, 1);
    saveReminders(userId, reminders);
    bot.answerCallbackQuery(query.id, { text: 'Reminder deleted.' });
    bot.sendMessage(userId, `🗑️ Deleted reminder: ${removed[0].note}`, mainKeyboard);
  } else {
    bot.answerCallbackQuery(query.id, { text: 'Unknown command.' });
  }
});

// Daily reminder scheduler (one notification per user per day)
const notifiedUsers = new Set();

schedule('0 9 * * *', () => {
  const today = new Date();
  const todayStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const users = fs.readdirSync(dataDir).filter((file) => file.endsWith('.json'));

  users.forEach((userFile) => {
    const userId = userFile.replace('.json', '');

    const reminders = loadReminders(userId);
    reminders.forEach((r) => {
      if (!r.date) return;
      if (r.date.slice(0, 5) === todayStr) {
        const age = calculateAge(r.date);
        const note = r.note?.trim();
        const ageText = age ? ` — turning ${age}!` : '!';
        const message = note
          ? `🎂 Don’t forget: ${note}${ageText} 🎈🎉`
          : `🎉 Someone is having a birthday${ageText}`;
        bot.sendMessage(userId, message);
      }
    });
  });
});

console.log('🤖 Bot is running...');
