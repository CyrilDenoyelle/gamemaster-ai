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
  async sendMessage(
    message: restrictedChatMessage,
    chatName: keyof ChatServiceArgs = 'messages',
  ) {
    this[chatName].push(message);
    const timer = Date.now();
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
  async randomSuggestion(
    message?: restrictedChatMessage,
    { min, max }: { min: number; max: number } = { min: 2, max: 3 },
  ) {
    await this.shiftMessagesUntilWithinLimit();
    this.listMessages.push(message);
    const listAnswer = [];
    const randomCount = Math.floor(Math.random() * (max - min + 1)) + min;
    const usermessage: restrictedChatMessage = {
      role: 'user',
      content: `${message ? message.content : 'Génère une idée.'}`,
    };

    const m = (i: number) =>
      i === 0
        ? usermessage
        : {
            role: 'user',
            content: 'Génère une autre idée. Avec les mêmes règles.',
          };

    const answerPromises = Array.from({ length: randomCount }).map(
      (_, i) => async () =>
        this.openAiService.sendChat([
          ...this.systemMessages,
          ...this.messages,
          ...listAnswer.reduce((acc, e, j) => {
            acc.push(m(j), e);
            return acc;
          }, []),
          m(i),
        ]),
    );

    for await (const answerPromise of answerPromises) {
      const textAnswer = await answerPromise();
      listAnswer.push({ role: 'assistant', content: textAnswer.trim() });
    }

    this.listMessages.push(...listAnswer);
    // choose a random answer from the list of answers
    const answer = listAnswer[listAnswer.length - 1];
    // push the "please generate" message and the random answer
    this.push(usermessage, answer);

    return answer.content;
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
   * @param {restrictedChatMessage[]} chat.messages - The list of messages in the chat.
   * @param {restrictedChatMessage[]} chat.systemMessages - The list of system messages in the chat.
   * @param {restrictedChatMessage[]} chat.longTermMemory - The long-term memory associated with the chat.
   * @param {restrictedChatMessage[]} chat.forgotenMessages - The list of forgotten messages in the chat.
   * @param {restrictedChatMessage[]} chat.listMessages - The list of forgotten messages in the chat.
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
    const tokens = encodeChat(
      chat,
      process.env.GPT_TOKENIZER_CHAT_MODEL as ModelName,
    );
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
