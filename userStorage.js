const fs = require('fs');
const path = require('path');

const storageDir = path.join(__dirname, 'data');
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir);
}

function getUserFilePath(userId) {
  return path.join(storageDir, `${userId}.json`);
}

function loadUserReminders(userId) {
  const file = getUserFilePath(userId);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file));
}

function saveUserReminders(userId, reminders) {
  const file = getUserFilePath(userId);
  fs.writeFileSync(file, JSON.stringify(reminders, null, 2));
}

module.exports = {
  loadUserReminders,
  saveUserReminders
};
