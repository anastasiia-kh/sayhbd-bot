// 📁 i18n.js

const translations = {
  choose_plan: {
    uk: 'Оберіть тип підписки:',
    en: 'Choose a subscription plan:',
  },
  payment_description: {
    uk: 'Оплата за доступ до додаткових нагадувань',
    en: 'Payment for extra birthday reminders',
  },
  subscription_activated: {
    uk: (date) => `✅ Підписку активовано до ${date}`,
    en: (date) => `✅ Subscription active until ${date}`,
  },
  help: {
    uk: `🆘 Допомога\n\nЦей бот допоможе вам не забути привітати друзів з Днем народження! Додайте нагадування, і бот нагадає вам у потрібний день.\n\nБезкоштовно доступно 3 нагадування, далі — підписка.`,
    en: `🆘 Help\n\nThis bot helps you remember birthdays! Add reminders, and you'll be notified on the day.\n\nYou can save 3 reminders for free, then a subscription is required.`,
  },
  start: {
    uk: 'Привіт! Я SayHBDbot 🎉\nДодай нагадування і тепер ти не забудеш когось привітати',
    en: 'Hello! I\'m SayHBDbot 🎉\nAdd a reminder so you won’t forget to say happy birthday!',
  },
};


function getLang(msg) {
  const userId = msg.from?.id || msg.chat?.id;
  const file = path.join(__dirname, 'data', `${userId}.json`);
  if (!fs.existsSync(file)) return 'uk'; // за замовчуванням українська
  const data = JSON.parse(fs.readFileSync(file));
  return data.lang || 'uk';
}


function t(lang, key, param) {
  const value = translations[key]?.[lang];
  if (!value) return '';
  return typeof value === 'function' ? value(param) : value;
}

module.exports = { getLang, t };
