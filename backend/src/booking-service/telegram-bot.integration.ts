import { Injectable } from "@nestjs/common";

export interface MessengerMessage {
  to: string;
  text: string;
}

/** Messenger: Telegram. */
@Injectable()
export class TelegramBot {
  private readonly telegramApiUrl = process.env.TELEGRAM_API_URL ?? "https://api.telegram.org";
  private readonly telegramBotToken = process.env.TELEGRAM_BOT_TOKEN ?? "";

  async sendMessage(message: MessengerMessage): Promise<void> {
    const payload: Record<string, string> = {
      chat_id: message.to,
      text: message.text,
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    const response = await fetch(`${this.telegramApiUrl}/bot${this.telegramBotToken}/sendMessage`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Telegram send failed: ${response.status} ${await response.text()}`);
    }

    const result = (await response.json()) as Record<string, unknown>;
    if (String(result.ok ?? "") !== "true") {
      throw new Error(`Telegram refused the message: ${JSON.stringify(result)}`);
    }
  }
}
