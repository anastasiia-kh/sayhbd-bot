// 📁 index.js — Telegram Bot logic

const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const { t, getLang } = require('./i18n');
const { loadReminders, saveReminder, deleteReminder, updateNote, getUserReminderCount } = require('./storage');
const { checkSubscription, isAdmin } = require('./subscription');
const { handlePayment } = require('./billing');

const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);

function sendMainMenu(ctx) {
  return ctx.reply(t(ctx, 'start'), Markup.keyboard([
    [t(ctx, 'buttons.add'), t(ctx, 'buttons.list')],
    [t(ctx, 'buttons.upcoming')],
    [t(ctx, 'buttons.change_language'), t(ctx, 'buttons.help')]
  ]).resize());
}

function normalizeDateInput(input) {
  const match = input.match(/^\d{2}[.\/-]\d{2}[.\/-](\d{2}|\d{4})$/);
  if (!match) return null;
  let [day, month, year] = input.split(/[.\/-]/);
  if (year.length === 2) year = `19${year}`;
  return `${day}-${month}-${year}`;
}

bot.start(async (ctx) => {
  await sendMainMenu(ctx);
});

bot.command('help', async (ctx) => {
  await ctx.reply(t(ctx, 'help'));
  await sendMainMenu(ctx);
});

bot.command('list', async (ctx) => {
  const reminders = loadReminders(ctx.from.id);
  if (reminders.length === 0) return ctx.reply(t(ctx, 'no_reminders'));
  let message = reminders.map((r, i) => `${i + 1}. ${r.date} — ${r.note}`).join('\n');
  await ctx.reply(message);
  await sendMainMenu(ctx);
});

bot.command('add', async (ctx) => {
  ctx.session = ctx.session || {};
  ctx.session.step = 'awaiting_date';
  await ctx.reply(t(ctx, 'enter_date'));
  await sendMainMenu(ctx);
});

bot.command('menu', async (ctx) => {
  await sendMainMenu(ctx);
});

bot.command('status', async (ctx) => {
  const { status, expiry } = checkSubscription(ctx.from.id);
  if (isAdmin(ctx.from.id)) return ctx.reply(t(ctx, 'admin_access'));
  if (!status) return ctx.reply(t(ctx, 'subscription_expired'));
  await ctx.reply(t(ctx, 'subscription_active', expiry));
  await sendMainMenu(ctx);
});

bot.on('text', async (ctx) => {
  ctx.session = ctx.session || {};
  const step = ctx.session.step;

  if (step === 'awaiting_date') {
    const raw = ctx.message.text.trim();
    const normalized = normalizeDateInput(raw);
    if (!normalized) return ctx.reply(t(ctx, 'invalid_date'));
    ctx.session.date = normalized;
    ctx.session.step = 'awaiting_note';
    return ctx.reply(t(ctx, 'enter_note') + `\n(${t(ctx, 'optional')})`,
      Markup.keyboard([[t(ctx, 'buttons.skip')]]).resize().oneTime());
  }

  if (step === 'awaiting_note') {
    const noteInput = ctx.message.text.trim();
    const note = (noteInput === t(ctx, 'buttons.skip')) ? '' : noteInput;
    const reminders = loadReminders(ctx.from.id);
    if (!isAdmin(ctx.from.id) && reminders.length >= 3 && !checkSubscription(ctx.from.id).status) {
      ctx.session = {};
      return ctx.reply(t(ctx, 'limit_exceeded'));
    }
    reminders.push({ date: ctx.session.date, note });
    saveReminder(ctx.from.id, reminders);
    ctx.session = {};
    await ctx.reply(t(ctx, 'reminder_added'));
    return sendMainMenu(ctx);
  }

  const txt = ctx.message.text;
  ctx.session.lastCommand = ctx.session.lastCommand || '';
  if (ctx.session.lastCommand === txt) return;
  ctx.session.lastCommand = txt;

  if ([t(ctx, 'buttons.help'), '/help'].includes(txt)) return bot.handleUpdate({ message: { text: '/help', from: ctx.from } });
  if ([t(ctx, 'buttons.add'), '/add'].includes(txt)) return bot.handleUpdate({ message: { text: '/add', from: ctx.from } });
  if ([t(ctx, 'buttons.list'), '/list'].includes(txt)) return bot.handleUpdate({ message: { text: '/list', from: ctx.from } });
  if ([t(ctx, 'buttons.upcoming')].includes(txt)) {
    const reminders = loadReminders(ctx.from.id);
    const next5 = reminders.slice(0, 5).map((r, i) => `${i + 1}. ${r.date} — ${r.note}`).join('\n') || t(ctx, 'no_reminders');
    return ctx.reply(next5);
  }
  if ([t(ctx, 'buttons.change_language')].includes(txt)) {
    const newLang = getLang(ctx) === 'uk' ? 'en' : 'uk';
    ctx.from.language_code = newLang;
    return sendMainMenu(ctx);
  }
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
