const fs = require('fs');
const path = require('path');

const storageDir = path.join(__dirname, 'data');

// Перевіряємо, чи існує папка 'data', якщо ні — створюємо
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
  console.log('Папка "data" була створена автоматично');
} else {
  console.log('Папка "data" існує');
}

function getUserFilePath(userId) {
  return path.join(storageDir, `${userId}.json`);
}

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

function saveUserReminders(userId, reminders) {
  const file = getUserFilePath(userId);
  try {
    fs.writeFileSync(file, JSON.stringify(reminders, null, 2), 'utf-8');
    console.log(`✅ Нагадування успішно збережено у файл: ${file}`);
  } catch (err) {
    console.error(`❌ Помилка запису у ${file}:`, err.message);
  }
}

module.exports = {
  loadUserReminders,
  saveUserReminders,
};
