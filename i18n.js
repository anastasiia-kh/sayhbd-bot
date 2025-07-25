// 🌐 i18n.js — переклади для інтерфейсу


function t(ctx, key) {
  const lang = ctx?.from?.language_code === 'uk' ? 'ua' : 'en';
  return translations[lang][key] || key;
}

module.exports = {
  t
};



const translations = {
  ua: {
    start: "Привіт! Я SayHBDbot 🎉\nДодай нагадування і тепер ти не забудеш когось привітати",
    help: `ℹ️ Я допомагаю не забути про важливі дати!

Команди:
• /add — додати нове нагадування
• /list — переглянути всі нагадування
• /next — показати 5 найближчих подій
• /lang — змінити мову
• /buy — оформити підписку
• /cancel — скасувати підписку`,
    enterName: "Введи ім'я або опис (можна з емодзі):",
    enterDate: "Введи дату у форматі дд.мм.рр або дд.мм.рррр (можна . / -):",
    enterNote: "Додай нотатку або натисни \"Пропустити\":",
    invalidDate: "❌ Невірний формат дати. Спробуй ще раз:",
    saved: "✅ Збережено!",
    noReminders: "ℹ️ Немає нагадувань",
    allReminders: "📋 Усі нагадування:",
    upcoming: "⏳ Наступні події:",
    reminderFormat: (r) => `📌 ${r.name} — ${r.date}${r.note ? `\n📝 ${r.note}` : ''}`,
    limitReached: "⚠️ Доступно лише 3 безкоштовних нагадування. Оформи підписку, щоб додати більше.",
    buy: "💳 Оформити підписку",
    skip: "Пропустити",
    langUpdated: "🇺🇦 Мову змінено на українську",
    subscriptionSuccess: "✅ Підписку оформлено! Дякую за підтримку 💙",
    subscriptionCancelled: "❌ Підписку скасовано",
    subscriptionReminder: "🔔 Нагадування: твоя підписка закінчується скоро. Оформи знову, щоб не втратити доступ.",
    alreadySubscribed: "У тебе вже активна підписка 💎",
    buyOptions: "Оберіть варіант підписки:",
    btnMonth: "1 міс (≈35 грн)",
    btnYear: "1 рік (≈380 грн)",
    mainMenu: "📋 Головне меню",
    btnAdd: "➕ Додати",
    btnList: "📄 Список",
    btnNext: "⏭ Наступні 5",
    btnHelp: "ℹ️ Допомога",
    btnLang: "🌍 Мова"
  },

  en: {
    start: "Hi! I'm SayHBDbot 🎉\nAdd a reminder so you never forget to congratulate someone",
    help: `ℹ️ I help you remember important dates!

Commands:
• /add — add a new reminder
• /list — see all reminders
• /next — upcoming 5 events
• /lang — change language
• /buy — get subscription
• /cancel — cancel subscription`,
    enterName: "Enter name or description (emoji allowed):",
    enterDate: "Enter the date (dd.mm.yy or dd.mm.yyyy — also supports . / -):",
    enterNote: "Add a note or press \"Skip\":",
    invalidDate: "❌ Invalid date format. Try again:",
    saved: "✅ Saved!",
    noReminders: "ℹ️ No reminders",
    allReminders: "📋 All reminders:",
    upcoming: "⏳ Upcoming events:",
    reminderFormat: (r) => `📌 ${r.name} — ${r.date}${r.note ? `\n📝 ${r.note}` : ''}`,
    limitReached: "⚠️ Only 3 free reminders allowed. Get a subscription to add more.",
    buy: "💳 Get subscription",
    skip: "Skip",
    langUpdated: "🇬🇧 Language switched to English",
    subscriptionSuccess: "✅ Subscription activated! Thanks for your support 💙",
    subscriptionCancelled: "❌ Subscription cancelled",
    subscriptionReminder: "🔔 Reminder: your subscription is ending soon. Renew to keep access.",
    alreadySubscribed: "You already have an active subscription 💎",
    buyOptions: "Choose a subscription plan:",
    btnMonth: "1 mo (~$0.99)",
    btnYear: "1 yr (~$9.99)",
    mainMenu: "📋 Main menu",
    btnAdd: "➕ Add",
    btnList: "📄 List",
    btnNext: "⏭ Next 5",
    btnHelp: "ℹ️ Help",
    btnLang: "🌍 Language"
  }
};

module.exports = (lang = 'ua') => translations[lang] || translations.ua;

