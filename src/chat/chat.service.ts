import { Injectable } from '@nestjs/common';
import { OpenAiService } from './open-ai/open-ai.service';
import { Chat } from 'openai/resources';
import { encodeChat } from 'gpt-tokenizer';
import { ChatMessage } from 'gpt-tokenizer/esm/GptEncoding';
import { ModelName } from 'gpt-tokenizer/esm/mapping';

export type ChatServiceArgs = {
  readonly messages?: restrictedChatMessage[];
  readonly systemMessages?: restrictedChatMessage[];
  readonly longTermMemory?: restrictedChatMessage[];
  readonly forgotenMessages?: restrictedChatMessage[];
  readonly listMessages?: restrictedChatMessage[];
};

export type restrictedChatMessage =
  | Chat.ChatCompletionUserMessageParam
  | Chat.ChatCompletionSystemMessageParam
  | Chat.ChatCompletionAssistantMessageParam;

@Injectable()
export class ChatService {
  messages: restrictedChatMessage[] = [];
  systemMessages: restrictedChatMessage[] = [];
  longTermMemory: restrictedChatMessage[] = [];
  forgotenMessages: restrictedChatMessage[] = [];
  listMessages: restrictedChatMessage[] = [];
  constructor(
    args: ChatServiceArgs,
    protected readonly openAiService: OpenAiService,
  ) {
    const {
      messages = [],
      systemMessages = [],
      longTermMemory = [],
      forgotenMessages = [],
    } = args;

    this.messages.push(...messages);
    this.systemMessages.push(...systemMessages);
    this.longTermMemory.push(...longTermMemory);
    this.forgotenMessages.push(...forgotenMessages);
  }

  /**
   * Send text to the chat
   * @param role The role of the user sending the text
   * @param content The text to send
   */
  async sendMessage(message: restrictedChatMessage) {
    this.push(message);
    await this.shiftMessagesUntilWithinLimit();
    const textAnswer = await this.openAiService.sendChat(this.getChat());
    this.push({ role: 'assistant', content: textAnswer.trim() });
    return textAnswer;
  }

  /**
   * Send text to the chat
   * @param message The role of the user sending the text
   * @param content The text to send
   */
  async randomSuggestion(message?: restrictedChatMessage) {
    await this.shiftMessagesUntilWithinLimit();
    const listPrompt = `${message.content ? message.content + '\n' : ''}Génère une liste de suggestions.
Chaque suggestion doit être auto-suffisante.
Respecte strictement la tâche donnée dans ton rôle. Ne dépasse pas ses exigences.
Ne numérote pas les suggestions.
Sépare chaque suggestion par '|'.
Aucun texte supplémentaire avant ou après la liste.`;
    this.listMessages.push({
      role: 'user',
      content: listPrompt,
    });
    const listAnswer = await this.openAiService.sendChat([
      ...this.systemMessages,
      ...this.messages,
      {
        role: 'user',
        content: listPrompt,
      },
    ]);
    this.listMessages.push({
      role: 'assistant',
      content: listAnswer,
    });
    const list = listAnswer.split('|');
    // choose a random answer from the list of answers
    const answer = list[Math.floor(Math.random() * list.length)];
    // push the "please generate" message and the random answer
    this.push(
      {
        role: 'user',
        content: `${message.content ? message.content + '\n' : ''}Génère une suggestion.`,
      },
      { role: 'assistant', content: answer.trim() },
    );

    return answer.trim();
  }

  /**
   * Push messages to the chat
   * @param messages The messages to push
   */
  push(...messages: restrictedChatMessage[]) {
    this.messages.push(...messages);
    // this.saveChat();
  }

  /**
   * Sets chat service properties.
   * @param {ChatServiceArgs} chatFactory - An object containing the chat service properties.
   * @param {restrictedChatMessage[]} chatFactory.messages - The list of messages in the chat.
   * @param {Chat.ChatCompletionMessageParam[]} chatFactory.systemMessages - The list of system messages in the chat.
   * @param {restrictedChatMessage[]} chatFactory.longTermMemory - The long-term memory associated with the chat.
   * @param {restrictedChatMessage[]} chatFactory.forgotenMessages - The list of forgotten messages in the chat.
   */
  set({
    messages,
    systemMessages,
    longTermMemory,
    forgotenMessages,
    listMessages,
  }: ChatServiceArgs) {
    this.systemMessages = systemMessages;
    this.messages = messages;
    this.longTermMemory = longTermMemory;
    this.listMessages = listMessages;
    this.forgotenMessages = forgotenMessages;
  }

  /**
   * Get all the chats
   */
  get(): ChatServiceArgs {
    return {
      systemMessages: this.systemMessages,
      messages: this.messages,
      longTermMemory: this.longTermMemory,
      listMessages: this.listMessages,
      forgotenMessages: this.forgotenMessages,
    };
  }

  /**
   * Get the chat messages with the system messages, long term memory, messages, and post user system message
   */
  getChat(): Chat.ChatCompletionMessageParam[] {
    return [...this.systemMessages, ...this.longTermMemory, ...this.messages];
  }

  /**
   * Get the number of tokens in the chat
   */
  tokenCount() {
    const chat = this.getChat() as ChatMessage[];
    const tokens = encodeChat(chat, process.env.OPENAI_CHAT_MODEL as ModelName);
    return tokens.length;
  }

  /**
   * shift messages until total tokens is less than process.env.OPENAI_API_MAX_CHAT_TOTAL_TOKEN
   */
  async shiftMessagesUntilWithinLimit() {
    const tokenCount = this.tokenCount();
    if (
      tokenCount > parseInt(process.env.OPENAI_API_MAX_CHAT_TOTAL_TOKEN, 10)
    ) {
      const forgotenMessage: restrictedChatMessage = this.messages.shift();
      this.forgotenMessages.push(forgotenMessage);
      const resume = await this.openAiService.sendChat([
        {
          role: 'system',
          content:
            'resume ce message en gardant uniquement les infos importantes en une courte phrase',
        },
        {
          role: 'user',
          content: forgotenMessage.content as string,
        },
      ]);
      this.longTermMemory.push({
        role: forgotenMessage.role,
        content: resume as string,
      });
      return await this.shiftMessagesUntilWithinLimit();
    }
  }
}
