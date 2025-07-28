const fs = require('fs');
const path = require('path');

// Папка для збереження даних
const storageDir = path.join(__dirname, 'data');
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

// Повний шлях до файлу користувача
function getUserFilePath(userId) {
  return path.join(storageDir, `${userId}.json`);
}

// Завантаження нагадувань
function loadUserReminders(userId) {
  const file = getUserFilePath(userId);
  if (!fs.existsSync(file)) return [];

  try {
    const data = fs.readFileSync(file, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`❌ Помилка читання ${file}:`, err.message);
    return [];
  }
}

// Збереження нагадувань
function saveUserReminders(userId, reminders) {
  const file = getUserFilePath(userId);
  try {
    fs.writeFileSync(file, JSON.stringify(reminders, null, 2), 'utf-8');
  } catch (err) {
    console.error(`❌ Помилка запису у ${file}:`, err.message);
  }
}

module.exports = {
  loadUserReminders,
  saveUserReminders
};
