// 📁 index.js (оновлено з багатомовністю)

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const { schedule } = require('node-cron');
const { getPaidUntil, setPaidUntil, hasPaid } = require('./subscription');
const { getLang, t } = require('./i18n');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const adminUserIds = ['438623792'];
const dateRegex = /^(\d{2})[-.\/]?(\d{2})[-.\/]?(\d{4})?$/;
const pendingEdits = {};

function loadReminders(userId) {
  const file = path.join(dataDir, `${userId}.json`);
  if (!fs.existsSync(file)) return [];
  const data = JSON.parse(fs.readFileSync(file));
  return data.reminders || [];
}

function saveReminders(userId, reminders) {
  const file = path.join(dataDir, `${userId}.json`);
  const current = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : {};
  fs.writeFileSync(file, JSON.stringify({ ...current, reminders }, null, 2));
}

function calculateAge(dateStr) {
  const [day, month, year] = dateStr.split('-').map(Number);
  if (!year) return null;
  const today = new Date();
  let age = today.getFullYear() - year;
  const birthDate = new Date(today.getFullYear(), month - 1, day);
  if (today < birthDate) age--;
  return age;
}

function parseDate(input) {
  const match = input.match(dateRegex);
  if (!match) return null;
  let [_, dd, mm, yyyy] = match;
  return `${dd}-${mm}-${yyyy || ''}`.trim();
}

function canAddReminder(userId, reminders) {
  if (adminUserIds.includes(userId)) return true;
  if (hasPaid(userId)) return true;
  return reminders.length < 3;
}

bot.onText(/\/start/, (msg) => {
  const lang = getLang(msg);
  bot.sendMessage(msg.chat.id, t(lang, 'start'));
});

bot.onText(/\/help/, (msg) => {
  const lang = getLang(msg);
  bot.sendMessage(msg.chat.id, t(lang, 'help'));
});

bot.onText(/\/add/, (msg) => {
  const lang = getLang(msg);
  bot.sendMessage(msg.chat.id, t(lang, 'enter_date'));
  bot.once('message', (dateMsg) => {
    const date = parseDate(dateMsg.text);
    if (!date) return bot.sendMessage(msg.chat.id, t(lang, 'invalid_date'));

    bot.sendMessage(msg.chat.id, t(lang, 'enter_note'));
    bot.once('message', (noteMsg) => {
      const reminders = loadReminders(msg.from.id);
      if (!canAddReminder(msg.from.id, reminders)) {
        return bot.sendMessage(msg.chat.id, t(lang, 'limit_exceeded'));
      }
      reminders.push({ date, note: noteMsg.text });
      saveReminders(msg.from.id, reminders);
      bot.sendMessage(msg.chat.id, t(lang, 'reminder_added'));
    });
  });
});

bot.onText(/\/list/, (msg) => {
  const lang = getLang(msg);
  const reminders = loadReminders(msg.from.id);
  if (!reminders.length) return bot.sendMessage(msg.chat.id, t(lang, 'no_reminders'));

  reminders.forEach((r, index) => {
    const age = calculateAge(r.date);
    const ageText = age ? t(lang, 'turning_age', age) : '';
    bot.sendMessage(msg.chat.id, `${index + 1}. ${r.date} — ${r.note}${ageText}`, {
      reply_markup: {
        inline_keyboard: [[
          { text: t(lang, 'edit'), callback_data: `edit_${index}` },
          { text: t(lang, 'delete'), callback_data: `delete_${index}` }
        ]]
      }
    });
  });
});

bot.on('callback_query', (query) => {
  const userId = query.from.id;
  const data = query.data;
  const reminders = loadReminders(userId);
  const index = parseInt(data.split('_')[1]);
  const lang = getLang(query);

  if (data.startsWith('delete_')) {
    reminders.splice(index, 1);
    saveReminders(userId, reminders);
    bot.sendMessage(userId, t(lang, 'reminder_deleted'));
  } else if (data.startsWith('edit_')) {
    bot.sendMessage(userId, t(lang, 'enter_new_note'));
    pendingEdits[userId] = index;
  }
});

bot.on('message', (msg) => {
  const userId = msg.from.id;
  const lang = getLang(msg);
  if (pendingEdits[userId] !== undefined) {
    const reminders = loadReminders(userId);
    reminders[pendingEdits[userId]].note = msg.text;
    saveReminders(userId, reminders);
    bot.sendMessage(userId, t(lang, 'note_updated'));
    delete pendingEdits[userId];
  }
});

bot.onText(/\/status/, (msg) => {
  const lang = getLang(msg);
  const until = getPaidUntil(msg.from.id);
  if (adminUserIds.includes(msg.from.id)) {
    return bot.sendMessage(msg.chat.id, t(lang, 'admin_access'));
  }
  if (!until) return bot.sendMessage(msg.chat.id, t(lang, 'no_subscription'));
  if (until < new Date()) return bot.sendMessage(msg.chat.id, t(lang, 'subscription_expired'));
  bot.sendMessage(msg.chat.id, t(lang, 'subscription_active', until.toLocaleDateString()));
});

schedule('* * * * *', () => {
  const today = new Date();
  const todayStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const users = fs.readdirSync(dataDir).filter((file) => file.endsWith('.json'));

  users.forEach((userFile) => {
    const userId = userFile.replace('.json', '');
    const data = JSON.parse(fs.readFileSync(path.join(dataDir, userFile)));
    const reminders = data.reminders || [];

    reminders.forEach((r) => {
      if (r.date && r.date.slice(0, 5) === todayStr) {
        const age = calculateAge(r.date);
        const note = r.note?.trim();
        const ageText = age ? t(data.lang || 'uk', 'today_age', age) : t(data.lang || 'uk', 'today');
        bot.sendMessage(userId, `${t(data.lang || 'uk', 'today_prefix')} ${note}${ageText}`);
      }
    });

    if (!adminUserIds.includes(userId) && data.paidUntil) {
      const paidUntil = new Date(data.paidUntil);
      const diffDays = Math.ceil((paidUntil - today) / (1000 * 60 * 60 * 24));
      if ([3, 1, 0].includes(diffDays)) {
        bot.sendMessage(userId, t(data.lang || 'uk', 'subscription_ending', diffDays));
      }
    }
  });
});
