// auth.js
module.exports = (allowedUserId) => {
  return async (ctx, next) => {
    if (!ctx.from || ctx.from.id !== allowedUserId) {
      await ctx.reply('❌ У тебе немає доступу до цього бота.');
      return; // Блокуємо доступ
    }
    return next(); // Пропускаємо далі
  };
};
