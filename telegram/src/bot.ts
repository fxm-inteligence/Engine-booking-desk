import { Telegraf } from "telegraf";

export const bot = new Telegraf(process.env.BOT_TOKEN ?? "");

bot.catch((error) => {
  console.error("A handler failed:", error);
});

bot.command("start", async (ctx) => {
  await ctx.reply("Booking Desk: бот записи клиентов. Команды: /services, /book, /mybookings.");
});

bot.command("services", async (ctx) => {
  await ctx.reply("Заготовка: здесь будет список услуг. API-клиент для него уже есть в telegram/src/api.");
});

bot.command("book", async (ctx) => {
  await ctx.reply("Заготовка: здесь будет запись к мастеру. Логику записи дописывает разработчик.");
});

bot.command("mybookings", async (ctx) => {
  await ctx.reply("Заготовка: здесь будут записи клиента. Логику дописывает разработчик.");
});
