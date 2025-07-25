// 📁 subscription.js

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');

function getPaidUntil(userId) {
  const file = path.join(dataDir, `${userId}.json`);
  if (!fs.existsSync(file)) return null;
  const data = JSON.parse(fs.readFileSync(file));
  if (!data.paidUntil) return null;
  return new Date(data.paidUntil);
}

function setPaidUntil(userId, date) {
  const file = path.join(dataDir, `${userId}.json`);
  const current = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : {};
  current.paidUntil = date.toISOString();
  fs.writeFileSync(file, JSON.stringify(current, null, 2));
}

function hasPaid(userId) {
  const until = getPaidUntil(userId);
  return until && until > new Date();
}

module.exports = { getPaidUntil, setPaidUntil, hasPaid };
