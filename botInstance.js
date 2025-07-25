// 📁 botInstance.js — create a single Telegraf bot instance
const { Telegraf } = require('telegraf');
require('dotenv').config();

if (!process.env.BOT_TOKEN) {
  throw new Error('BOT_TOKEN not set in .env');
}

const bot = new Telegraf(process.env.BOT_TOKEN);
module.exports = bot;
