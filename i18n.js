// 📁 i18n.js

const translations = {
  choose_plan: {
    uk: 'Оберіть тип підписки:',
    en: 'Choose a subscription plan:'
  },
  payment_description: {
    uk: 'Оплата за доступ до додаткових нагадувань',
    en: 'Payment for extra birthday reminders'
  },
  subscription_activated: {
    uk: (date) => `✅ Підписку активовано до ${date}`,
    en: (date) => `✅ Subscription active until ${date}`
  },
  help: {
    uk: `🆘 Допомога\n\nЦей бот допоможе вам не забути привітати друзів з Днем народження! Додайте нагадування, і бот нагадає вам у потрібний день.\n\nБезкоштовно доступно 3 нагадування, далі — підписка.`,
    en: `🆘 Help\n\nThis bot helps you remember birthdays! Add reminders, and you'll be notified on the day.\n\nYou can save 3 reminders for free, then a subscription is required.`
  }
};

function getLang(msg) {
  return msg?.from?.language_code === 'en' ? 'en' : 'uk';
}

function t(lang, key, param) {
  const value = translations[key]?.[lang];
  if (!value) return '';
  return typeof value === 'function' ? value(param) : value;
}

module.exports = { getLang, t };
