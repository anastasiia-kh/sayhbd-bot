// 📦 storage.js — збереження нагадувань користувачів та мови

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

function getUserFilePath(userId) {
  return path.join(dataDir, `${userId}.json`);
}

function loadUserData(userId) {
  const file = getUserFilePath(userId);
  if (fs.existsSync(file)) {
    try {
      return JSON.parse(fs.readFileSync(file));
    } catch (e) {
      console.error(`❌ Error reading ${file}:`, e);
    }
  }
  return { reminders: [], lang: 'ua' };
}

function saveUserData(userId, data) {
  const file = getUserFilePath(userId);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function getReminders(userId) {
  return loadUserData(userId).reminders;
}

function saveReminder(userId, reminder) {
  const data = loadUserData(userId);
  data.reminders.push(reminder);
  saveUserData(userId, data);
}

function getLang(userId) {
  return loadUserData(userId).lang || 'ua';
}

function setLang(userId, lang) {
  const data = loadUserData(userId);
  data.lang = lang;
  saveUserData(userId, data);
}

function setReminders(userId, reminders) {
  const data = loadUserData(userId);
  data.reminders = reminders;
  saveUserData(userId, data);
}

function getUserData(userId) {
  return loadUserData(userId);
}

function setUserData(userId, newData) {
  const data = loadUserData(userId);
  saveUserData(userId, { ...data, ...newData });
}

module.exports = {
  getReminders,
  saveReminder,
  getLang,
  setLang,
  setReminders,
  getUserData,
  setUserData,
  getUserFilePath,
  dataDir
};
