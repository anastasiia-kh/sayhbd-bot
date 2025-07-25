// 📁 storage.js — збереження нагадувань

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

function getFilePath(userId) {
  return path.join(dataDir, `${userId}.json`);
}

function loadReminders(userId) {
  const file = getFilePath(userId);
  if (!fs.existsSync(file)) return [];
  const raw = fs.readFileSync(file);
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error('❌ JSON parse error:', err);
    return [];
  }
}

function saveReminder(userId, reminders) {
  const file = getFilePath(userId);
  fs.writeFileSync(file, JSON.stringify(reminders, null, 2));
}

module.exports = {
  loadReminders,
  saveReminder
};
