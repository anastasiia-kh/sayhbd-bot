// 📁 billing.js

const TelegramBot = require('node-telegram-bot-api');
const { setPaidUntil } = require('./subscription');
const { getLang, t } = require('./i18n');

// 💵 Типи підписок
const plans = {
  month: {
    price: 40, // гривні ≈ 0.99$
    durationDays: 30,
    title: {
      en: 'SayHBDbot — Monthly Subscription',
      uk: 'SayHBDbot — Підписка на місяць'
    },
    payload: 'subscribe_month'
  },
  year: {
    price: 400, // гривні ≈ 9.99$
    durationDays: 365,
    title: {
      en: 'SayHBDbot — Yearly Subscription',
      uk: 'SayHBDbot — Підписка на рік'
    },
    payload: 'subscribe_year'
  }
};

function sendPaymentOptions(bot, chatId, lang = 'uk') {
  const prices = Object.entries(plans).map(([key, plan]) => [{
    text: `${plan.title[lang]} — USD ≈ ${(plan.price / 40).toFixed(2)}$`,
    callback_data: `buy_${key}`
  }]);

  bot.sendMessage(chatId, t(lang, 'choose_plan'), {
    reply_markup: { inline_keyboard: prices }
  });
}

function handlePaymentCallback(bot, msg) {
  const match = msg.data.match(/^buy_(\w+)$/);
  if (!match) return;
  const plan = plans[match[1]];
  if (!plan) return;

  const lang = getLang(msg);

  bot.sendInvoice(
    msg.from.id,
    plan.title[lang],
    t(lang, 'payment_description'),
    plan.payload,
    process.env.PROVIDER_TOKEN,
    '',
    'UAH',
    [{ label: plan.title[lang], amount: plan.price * 100 }]
  );
}

function handleSuccessfulPayment(bot, msg) {
  const userId = msg.from.id;
  const planKey = Object.keys(plans).find(
    key => msg.successful_payment.invoice_payload === plans[key].payload
  );
  const plan = plans[planKey];
  if (!plan) return;

  const now = new Date();
  const newDate = new Date(now.setDate(now.getDate() + plan.durationDays));
  setPaidUntil(userId, newDate);

  const lang = getLang(msg);
  bot.sendMessage(userId, t(lang, 'subscription_activated', newDate.toLocaleDateString()));
}

module.exports = {
  sendPaymentOptions,
  handlePaymentCallback,
  handleSuccessfulPayment
};
