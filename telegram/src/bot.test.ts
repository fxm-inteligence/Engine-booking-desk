import { strict as assert } from "node:assert";
import { test } from "node:test";

import { formatResult } from "./api/format";

test("formatResult shows the chosen field of every item, one per line", () => {
  const items = [{ name: "Cut", price: { rub: 1500 } }, { name: "Dye", price: { rub: 4000 } }];
  assert.equal(formatResult(items, "name"), "Cut\nDye");
  assert.equal(formatResult(items, "price.rub"), "1500\n4000");
});

test("formatResult shows one value as it is and a missing field as nothing", () => {
  assert.equal(formatResult({ name: "Cut" }, "name"), "Cut");
  assert.equal(formatResult({ name: "Cut" }, "missing"), "");
  assert.equal(formatResult(null, "name"), "");
});

// No token and no network: the bot is built with a made-up token, Telegram's API is a recorder,
// and the REST API is an address nothing listens on, so a command that asks it answers with its refusal.
// Telegraf builds a new client for every update, so the recorder replaces callApi on the class.
process.env.BOT_TOKEN = process.env.BOT_TOKEN || "123456:test-token";
process.env.API_URL = "http://127.0.0.1:9";
const { bot } = require("./bot") as typeof import("./bot");
const { Telegram } = require("telegraf") as typeof import("telegraf");

const calls: { method: string; payload: unknown }[] = [];
bot.botInfo = {
  id: 1,
  is_bot: true,
  first_name: "Test",
  username: "test_bot",
  can_join_groups: true,
  can_read_all_group_messages: false,
  supports_inline_queries: false,
} as never;
Telegram.prototype.callApi = (async (method: string, payload: unknown) => {
  calls.push({ method, payload });
  return { message_id: 1, date: 0, chat: { id: 1, type: "private" } };
}) as never;

let updateId = 1;
function commandUpdate(name: string) {
  const text = "/" + name;
  updateId += 1;
  return {
    update_id: updateId,
    message: {
      message_id: updateId,
      date: Math.floor(Date.now() / 1000),
      chat: { id: 1, type: "private", first_name: "Test" },
      from: { id: 1, is_bot: false, first_name: "Test" },
      text,
      entities: [{ offset: 0, length: text.length, type: "bot_command" }],
    },
  };
}

const originalError = console.error;
for (const name of ["start","mybookings","services","book"]) {
  test("/" + name + " is answered", async () => {
    calls.length = 0;
    console.error = () => {};
    try {
      await bot.handleUpdate(commandUpdate(name) as never);
    } finally {
      console.error = originalError;
    }
    assert.ok(calls.length > 0, "the bot sent nothing in answer to /" + name);
  });
}
