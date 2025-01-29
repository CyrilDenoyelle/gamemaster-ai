import { Injectable } from '@nestjs/common';
import { OpenAiService } from './open-ai/open-ai.service';
import { Chat } from 'openai/resources';

@Injectable()
export class ChatService {
  constructor(private openAiService: OpenAiService) {}

  chatHistory: Chat.ChatCompletionMessageParam[] = [
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
      this.openAiService.sendChat(this.chatHistory);
    }
  }
}
