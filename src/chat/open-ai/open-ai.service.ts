import { forwardRef, Inject, Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { AudioStreamGateway } from 'src/audiostream/audiostream.gateway';
import { ChatService } from '../chat.service';
import { Chat } from 'openai/resources';
@Injectable()
export class OpenAiService {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  baseSettings = {
    model: process.env.OPENAI_CHAT_MODEL,
    max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS_BY_MESSAGE, 10),
    temperature: parseInt(process.env.AI_TEMPERATURE, 10),
  };

  constructor(
    @Inject(forwardRef(() => AudioStreamGateway))
    private audioStreamGateway: AudioStreamGateway,
    @Inject(forwardRef(() => ChatService))
    private chatService: ChatService,
  ) {}

  /**
   * Send a message to the OpenAI chat model
   * @param chat The messages to send
   * @returns The response from the chat model
   */
  sendChat = async (chat: Chat.ChatCompletionMessageParam[]) => {
    const answer = await this.openai.chat.completions.create({
      ...this.baseSettings,
      messages: chat,
    });
    this.audioStreamGateway.sendText(
      answer.choices[0].message.content.replace('*', ''),
    );

    this.chatService.sendText({
      role: 'assistant',
      text: answer.choices[0].message.content,
      userId: process.env.BOT_ID,
    });
  };
}
