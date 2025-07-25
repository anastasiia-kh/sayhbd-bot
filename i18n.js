// 📁 i18n.js — Мовні ресурси

const translations = {
  en: {
    start: 'Welcome! I can remind you about birthdays. Use /add to create a reminder.',
    help: 'Commands:\n/add — add a reminder\n/list — list all reminders\n/status — check subscription',
    enter_date: 'Please enter the date in DD-MM or DD-MM-YYYY format.',
    invalid_date: 'Invalid date format. Try again.',
    enter_note: 'What should I remind you about?',
    reminder_added: 'Reminder saved! 🎉',
    no_reminders: 'You have no reminders yet.',
    edit: '✏️ Edit',
    delete: '🗑️ Delete',
    enter_new_note: 'Enter new note text:',
    note_updated: 'Note updated! ✅',
    reminder_deleted: 'Reminder deleted.',
    limit_exceeded: 'You can only create 3 reminders without a subscription.',
    subscription_ending: (days) => `Your subscription ends in ${days} day(s).`,
    subscription_expired: 'Your subscription has expired.',
    no_subscription: 'You do not have a subscription.',
    subscription_active: (date) => `Your subscription is active until ${date}.`,
    admin_access: 'You are an admin. Subscription limits do not apply.',
    today_prefix: '🎂 Today:',
    today: '!',
    today_age: (age) => ` — turning ${age}!`,
    turning_age: (age) => ` — turning ${age}!`
  },
  uk: {
    start: 'Привіт! Я можу нагадувати про дні народження. Натисни /add щоб створити нагадування.',
    help: 'Команди:\n/add — додати нагадування\n/list — список нагадувань\n/status — статус підписки',
    enter_date: 'Введіть дату у форматі ДД-ММ або ДД-ММ-РРРР.',
    invalid_date: 'Неправильний формат дати. Спробуйте ще раз.',
    enter_note: 'Про що нагадати?',
    reminder_added: 'Нагадування збережено! 🎉',
    no_reminders: 'У вас ще немає нагадувань.',
    edit: '✏️ Редагувати',
    delete: '🗑️ Видалити',
    enter_new_note: 'Введіть новий текст нотатки:',
    note_updated: 'Нотатку оновлено! ✅',
    reminder_deleted: 'Нагадування видалено.',
    limit_exceeded: 'Можна створити лише 3 нагадування без підписки.',
    subscription_ending: (days) => `Ваша підписка закінчується через ${days} дн(і/ів).`,
    subscription_expired: 'Термін дії вашої підписки закінчився.',
    no_subscription: 'У вас немає активної підписки.',
    subscription_active: (date) => `Ваша підписка дійсна до ${date}.`,
    admin_access: 'Ви адміністратор. Ліміти не застосовуються.',
    today_prefix: '🎂 Сьогодні:',
    today: '!',
    today_age: (age) => ` — виповнюється ${age}!`,
    turning_age: (age) => ` — виповнюється ${age}!`
  }
};

function getLang(ctx) {
  const lang = ctx?.from?.language_code;
  return lang === 'uk' ? 'uk' : 'en';
}

function t(ctx, key, ...args) {
  const lang = getLang(ctx);
  const translation = translations[lang][key];
  if (typeof translation === 'function') {
    return translation(...args);
  }
  return translation || key;
}

module.exports = {
  translations,
  getLang,
  t
};
