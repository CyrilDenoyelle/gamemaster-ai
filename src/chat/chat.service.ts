import { Injectable } from '@nestjs/common';
import { OpenAiService } from './open-ai/open-ai.service';
import { Chat } from 'openai/resources';
import { isWithinTokenLimit } from 'gpt-tokenizer';
@Injectable()
export class ChatService {
  constructor(private openAiService: OpenAiService) {}

  chatHistory: Chat.ChatCompletionMessageParam[] = [];
  systemMessages: Chat.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: 'You are a helpful assistant.',
    },
  ];

  /**
   * Send text to the chat
   * @param role The role of the user sending the text
   * @param text The text to send
   * @param userId The user ID of the sender
   */
  sendText({ role, text, userId }) {
    this.chatHistory.push({ role, content: text });
    console.log(`Sending text from ${userId}: ${text}`);
    if (role === 'user') {
      this.shiftMessagesUntilWithinLimit();
      this.openAiService.sendChat([
        ...this.systemMessages,
        ...this.chatHistory,
      ]);
    }
  }

  /**
   * shift messages until total tokens is less than process.env.OPENAI_API_MAX_CHAT_TOTAL_TOKEN
   */
  shiftMessagesUntilWithinLimit = () => {
    const inlimite = () => {
      const tokenCount = isWithinTokenLimit(
        [...this.systemMessages, ...this.chatHistory]
          .map((m) => `${m.role}: "${m.content}"\n`)
          .join(''),
        parseInt(process.env.OPENAI_API_MAX_CHAT_TOTAL_TOKEN, 10),
      );
      if (tokenCount) {
        console.log('tokenCount', tokenCount);
      }
      return tokenCount;
    };
    while (inlimite() === false) {
      console.log('shift');
      this.chatHistory.shift();
    }
  };
}
