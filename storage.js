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
  const filePath = getFilePath(userId);
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
      console.error(`❌ Error reading reminders for ${userId}:`, err);
      return [];
    }
  }
  return [];
}

function saveReminders(userId, reminders) {
  const filePath = getFilePath(userId);
  fs.writeFileSync(filePath, JSON.stringify(reminders, null, 2), 'utf8');
}

module.exports = {
  loadReminders,
  saveReminders,
};
