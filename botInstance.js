// botInstance.js
const { Telegraf, session } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

module.exports = bot;
