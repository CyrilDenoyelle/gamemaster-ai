import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { OpenAiService } from './open-ai/open-ai.service';
import { Chat } from 'openai/resources';
import { encodeChat } from 'gpt-tokenizer/cjs/model/gpt-4o';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { PromptCompilerService } from 'src/prompt-compiler/prompt-compiler.service';
import { ModelName } from 'gpt-tokenizer/esm/mapping';
import { ChatMessage } from 'gpt-tokenizer/esm/GptEncoding';
import { AudioStreamGateway } from 'src/audiostream/audiostream.gateway';

type restrictedChatMessage =
  | Chat.ChatCompletionUserMessageParam
  | Chat.ChatCompletionSystemMessageParam
  | Chat.ChatCompletionAssistantMessageParam;

@Injectable()
export class ChatService {
  currentChatName: string;
  // chats: Map<string, { creationDate: Date; current: boolean }>;
  messages: restrictedChatMessage[] = [];
  longTermMemory: restrictedChatMessage[] = [
    {
      role: 'system',
      content: `Historique des événements importants de l'histoire:`,
    },
  ];
  forgotenMessages: restrictedChatMessage[] = [];
  postUserSystemMessage: restrictedChatMessage = {
    role: 'system',
    content: `Fin de la réponse des joueurs.
Réponds aux joueurs de façon concise et précise.
La longueur de ta réponse dépend de la situation, au maximum dix phrases.
Uniquement ce que tu veux dire aux joueurs.
Ne dit pas ce que les joueurs savent déjà, mais ce qu'ils voient, entendent, etc.
Ne parle pas à la place des joueurs, ne choisis pas leurs actions.`,
  };
  systemMessages: Chat.ChatCompletionMessageParam[] = [];
  initialSystemMessage: string = `
set(nom1|random(prompt(une liste de prénom masculin séparé par des pipes)))
set(nom2|random(prompt(une liste de prénom feminins séparé par des pipes)))
Crée une histoire immersive et originale qui répond aux critères suivants :
Genre : setget(genre|random(prompt(une liste de genre d'histoires adaptées a du jeu de rôle, séparé par des pipes|1))).
Style : setget(style|random(prompt(une liste de genre d'univers adaptées a du jeu de rôle, séparé par des pipes|1))).
Cadre : prompt(décris en quelques lignes un univers du style "get(style)", avec ses lieux, qui sert au genre "get(genre)" en décrivant en détail le décor, en 3 lignes).
Personnages joueurs : prompt(donne moi deux courte descripions de deux peronnages només: get(nom1) et get(nom2) en deux lignes chacune qui marche avec le genre "get(genre)").
Intrigue : L’histoire doit inclure un enjeu principal. Une quête ou mission, un mystère à résoudre, un danger imminent, etc.). Avec des rebondissements imprévus.
Développement : Intègre une montée en tension avec des obstacles significatifs, des dilemmes moraux ou émotionnels, et une résolution cohérente.
Ton et style : Adopte un ton sérieux, humoristique, poétique ou autre, et un style narratif immersif.`;

  constructor(
    private openAiService: OpenAiService,
    @Inject(forwardRef(() => PromptCompilerService))
    private promptCompiler: PromptCompilerService,
    @Inject(forwardRef(() => AudioStreamGateway))
    private audioStreamGateway: AudioStreamGateway,
  ) {}

  /**
   * Get the chat messages with the system messages, long term memory, messages, and post user system message
   */
  getChat(): Chat.ChatCompletionMessageParam[] {
    return [
      ...this.systemMessages,
      ...this.longTermMemory,
      ...this.messages,
      this.postUserSystemMessage,
    ];
  }

  /**
   * Send text to the chat
   * @param role The role of the user sending the text
   * @param text The text to send
   * @param userId The user ID of the sender
   */
  async sendMessage({ role, content, userId }) {
    this.messages.push({ role, content });
    this.saveChat();
    console.log(`${role}: ${content}`);
    if (role === 'user') {
      await this.shiftMessagesUntilWithinLimit();
      const textAnswer = await this.openAiService.sendChat(this.getChat());
      this.audioStreamGateway.sendText(textAnswer.replace(/\*/g, ''));
      await this.sendMessage({
        role: 'assistant',
        content: textAnswer,
        userId: process.env.BOT_ID,
      });
    }
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
            'resume ce message en gardant uniquement les infos importantes en une courte phrase:',
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

  setChat(chatName: string) {
    this.currentChatName = chatName;
    this.loadChat();
  }

  /**
   * save current chat messages to chats/chatName file.
   */
  saveChat() {
    // check if chats folder exists
    if (!existsSync('chats')) {
      mkdirSync('chats');
    }
    writeFileSync(
      `chats/${this.currentChatName}.json`,
      JSON.stringify(
        {
          systemMessages: this.systemMessages,
          forgotenMessages: this.forgotenMessages,
          longTermMemory: this.longTermMemory,
          messages: this.messages,
        },
        null,
        2,
      ),
    );
  }

  /**
   * create chat file.
   */
  async createChat() {
    const compiled = await this.promptCompiler.exec(this.initialSystemMessage);
    console.log('compiled', compiled);
    this.systemMessages.push({
      role: 'system',
      content: compiled,
    });
    await this.sendMessage({
      role: 'user',
      content: `Tu est le maitre du jeu, lance le début de l'histoire pour les joueurs.
        Tout ce que tu dis est important soit pour l'histoire soit pour l'ambiance.
        Les joueurs n'ont pas lue ce qui précède ce message.
        Les joueurs t'écoute.`,
      userId: process.env.BOT_ID,
    });
    writeFileSync(
      `chats/${this.currentChatName}.json`,
      JSON.stringify(
        {
          systemMessages: this.systemMessages,
          messages: this.messages,
        },
        null,
        2,
      ),
    );
  }

  /**
   * load chat messages by name in chats/chatName file.
   */
  loadChat() {
    // check if chats folder exists
    if (!existsSync('chats')) {
      mkdirSync('chats');
      return;
    }
    // check if chat file exists
    if (!existsSync(`chats/${this.currentChatName}.json`)) {
      this.createChat();
      return;
    }
    const chat = JSON.parse(
      readFileSync(`chats/${this.currentChatName}.json`, 'utf-8'),
    );
    this.systemMessages = chat.systemMessages || [];
    this.forgotenMessages = chat.forgotenMessages || [];
    this.longTermMemory = chat.longTermMemory || [];
    this.messages = chat.messages || [];
  }
}
