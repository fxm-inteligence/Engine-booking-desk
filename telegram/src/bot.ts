import { refusalFor } from "./api/client";
import { book, freeTimes, listServices, masters, services } from "./api/endpoints";
import { formatResult } from "./api/format";
import { SessionStore } from "./session-store";
import { Markup, Telegraf } from "telegraf";

export const bot = new Telegraf(process.env.BOT_TOKEN ?? "");

bot.catch((error) => {
  console.error("A handler failed:", error);
});

const serviceSession = new SessionStore();

const masterSession = new SessionStore();

const daySession = new SessionStore();

bot.command("start", async (ctx) => {
  await ctx.reply("Здравствуйте! Это запись в Booking Desk.\n/services — услуги\n/book — записаться\n/mybookings — мои записи");
});

bot.command("mybookings", async (ctx) => {
  await ctx.reply("Список ваших записей в боте пока недоступен: записи видит только персонал. Позвоните нам, и мы подскажем.");
});

bot.command("services", async (ctx) => {
  let result: unknown;
  try {
    result = await listServices();
  } catch (error) {
    console.error("The API call failed:", error);
    await ctx.reply(refusalFor(error, "Сервис записи сейчас недоступен"));
    return;
  }
  await ctx.reply("Наши услуги:\n" + formatResult(result, ""));
});

bot.command("book", async (ctx) => {
  let result: unknown;
  try {
    result = await services();
  } catch (error) {
    console.error("The API call failed:", error);
    await ctx.reply(refusalFor(error, "Сервис записи сейчас недоступен"));
    return;
  }
  await ctx.reply("Выберите услугу", Markup.inlineKeyboard([...(Array.isArray(result) ? result : []).map((item) => Markup.button.callback(formatResult(item, "name"), "s:" + formatResult(item, "id")))], { columns: 1 }));
});

bot.action(/^s:/, async (ctx) => {
  await ctx.answerCbQuery();
  serviceSession.set(String(ctx.from?.id), ("data" in ctx.callbackQuery ? ctx.callbackQuery.data : "").slice(2));
  let result: unknown;
  try {
    result = await masters();
  } catch (error) {
    console.error("The API call failed:", error);
    await ctx.reply(refusalFor(error, "Сервис записи сейчас недоступен"));
    return;
  }
  await ctx.reply("Выберите мастера", Markup.inlineKeyboard([...(Array.isArray(result) ? result : []).map((item) => Markup.button.callback(formatResult(item, "name"), "m:" + formatResult(item, "id")))], { columns: 1 }));
});

bot.action(/^m:/, async (ctx) => {
  await ctx.answerCbQuery();
  masterSession.set(String(ctx.from?.id), ("data" in ctx.callbackQuery ? ctx.callbackQuery.data : "").slice(2));
  await ctx.reply("Выберите день", Markup.inlineKeyboard([[Markup.button.callback("Сегодня", "d:0"), Markup.button.callback("Завтра", "d:1"), Markup.button.callback("Послезавтра", "d:2")]]));
});

bot.action(/^d:/, async (ctx) => {
  await ctx.answerCbQuery();
  let result: unknown;
  try {
    result = await freeTimes((masterSession.get(String(ctx.from?.id)) ?? ""), (serviceSession.get(String(ctx.from?.id)) ?? ""), new Date(Date.now() + (Number(("data" in ctx.callbackQuery ? ctx.callbackQuery.data : "").slice(2)) || 0) * 86400000).toLocaleDateString("en-CA"));
  } catch (error) {
    console.error("The API call failed:", error);
    await ctx.reply(refusalFor(error, "Сервис записи сейчас недоступен"));
    return;
  }
  await ctx.reply("Выберите время", Markup.inlineKeyboard([...(Array.isArray(result) ? result : []).map((item) => Markup.button.callback(formatResult(item, "time"), "h:" + formatResult(item, "start")))], { columns: 3 }));
});

bot.action(/^h:/, async (ctx) => {
  await ctx.answerCbQuery();
  let result: unknown;
  try {
    result = await book({ serviceId: (serviceSession.get(String(ctx.from?.id)) ?? ""), masterId: (masterSession.get(String(ctx.from?.id)) ?? ""), startsAt: (("data" in ctx.callbackQuery ? ctx.callbackQuery.data : "").slice(2)), clientTelegramId: String(ctx.from?.id ?? ""), clientName: "Telegram " + String(ctx.from?.id ?? ""), clientPhone: "tg:" + String(ctx.from?.id ?? "") });
  } catch (error) {
    console.error("The API call failed:", error);
    await ctx.reply(refusalFor(error, "Сервис записи сейчас недоступен"));
    return;
  }
  await ctx.reply("Готово, вы записаны! Мы напишем, когда запись подтвердят.");
});
