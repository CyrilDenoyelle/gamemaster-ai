import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { Chat } from 'openai/resources';
@Injectable()
export class OpenAiService {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  baseSettings = {
    model: process.env.OPENAI_CHAT_MODEL,
    max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS_BY_MESSAGE, 10),
    temperature: parseFloat(process.env.AI_TEMPERATURE),
    frequency_penalty: parseFloat(process.env.AI_FREQUENCY_PENALTY),
  };

  constructor() {}

  /**
   * Send a message to the OpenAI chat model
   * @param chat The messages to send
   * @param model The model to use
   * @returns The response from the chat model
   */
  sendChat = async (
    chat: Chat.ChatCompletionMessageParam[],
    model: string = this.baseSettings.model,
  ): Promise<string> => {
    const answer = await this.openai.chat.completions.create({
      ...this.baseSettings,
      model: model,
      messages: chat,
    });
    return answer.choices[0].message.content;
  };

  /**
   * Send a message to the OpenAI chat model
   * @param text The message to send
   * @returns The response from the chat model
   */
  prompt = async (text: string) => {
    const answer = await this.openai.chat.completions.create({
      ...this.baseSettings,
      messages: [
        {
          role: 'system',
          content: text,
        },
      ],
    });
    return answer.choices[0].message.content;
  };
}
