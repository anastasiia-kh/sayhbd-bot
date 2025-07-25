// 📁 billing.js — Telegram Payments

const { t } = require('./i18n');
const { checkSubscription, addSubscription } = require('./subscription');
const bot = require('./botInstance');

bot.command('buy', async (ctx) => {
  const { status } = checkSubscription(ctx.from.id);
  if (status) return ctx.reply(t(ctx, 'subscription_already_active'));

  await ctx.replyWithInvoice({
    title: 'SayHBDbot',
    description: t(ctx, 'pay.description'),
    payload: 'birthday_subscription',
    provider_token: process.env.PROVIDER_TOKEN,
    currency: 'USD',
    prices: [{ label: t(ctx, 'pay.label'), amount: 200 * 100 }],
    start_parameter: 'subscribe',
  });
});

bot.on('pre_checkout_query', (ctx) => ctx.answerPreCheckoutQuery(true));

bot.on('successful_payment', async (ctx) => {
  const { id, first_name } = ctx.from;
  addSubscription(id);
  console.log(`🎉 ${first_name} just paid!`);
  await ctx.reply(t(ctx, 'pay.success'));
});
