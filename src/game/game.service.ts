import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Chat } from 'openai/resources';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { PromptCompilerService } from 'src/prompt-compiler/prompt-compiler.service';
import { AudioStreamGateway } from 'src/audiostream/audiostream.gateway';
import {
  ChatService,
  ChatServiceFactory,
  ChatServiceFactoryChats,
} from 'src/chat/chat.service';

type restrictedChatMessage =
  | Chat.ChatCompletionUserMessageParam
  | Chat.ChatCompletionSystemMessageParam
  | Chat.ChatCompletionAssistantMessageParam;

@Injectable()
export class GameService {
  currentGameName: string;
  initialSystemMessage: string = `
set(nom1|random(prompt(une liste de prénom masculin séparé par des pipes)))
set(nom2|random(prompt(une liste de prénom feminins séparé par des pipes)))
Crée une histoire immersive et originale qui répond aux critères suivants :
Genre : setget(genre|random(prompt(une liste de genre d'histoires adaptées a du jeu de rôle, séparé par des pipes|1))).
Style : setget(style|random(prompt(une liste de genre d'univers adaptées a du jeu de rôle, séparé par des pipes|1))).
Cadre : prompt(décris en quelques lignes un univers du style "get(style)", avec ses lieux, qui sert au genre "get(genre)" en décrivant en détail le décor, en 3 lignes).
Personnages joueurs : prompt(donne moi deux courte descripions de deux peronnages només: get(nom1) et get(nom2) en deux lignes chacune qui marche avec le genre "get(genre)").
Intrigue : L'histoire doit inclure un enjeu principal. Une quête ou mission, un mystère à résoudre, un danger imminent, etc.). Avec des rebondissements imprévus.
Développement : Intègre une montée en tension avec des obstacles significatifs, des dilemmes moraux ou émotionnels, et une résolution cohérente.
Ton et style : Adopte un ton sérieux, humoristique, poétique ou autre, et un style narratif immersif.`;

  private gameState: { [key: string]: unknown } = {};
  private chats: { [key: string]: ChatService } = {};
  constructor(
    @Inject(forwardRef(() => PromptCompilerService))
    private promptCompiler: PromptCompilerService,
    @Inject(forwardRef(() => AudioStreamGateway))
    private audioStreamGateway: AudioStreamGateway,
    @Inject('ChatServiceFactory')
    private chatServiceFactory: ChatServiceFactory,
  ) {}

  /**
   * set current chat messages to chats/chatName file.
   * @param name
   */
  setGame(name: string) {
    this.currentGameName = name;
    this.loadGame();
  }

  /**
   * send message to chat.
   */
  async sendMessage(message: restrictedChatMessage) {
    const mainChat = this.chats.mainChat;
    if (mainChat) {
      const answer = await mainChat.sendMessage(message);
      this.audioStreamGateway.sendText(answer.replace(/\*/g, ''));
    }
    this.saveGame();
  }

  /**
   * create game files.
   */
  async createGame() {
    const compiled = await this.promptCompiler.exec(this.initialSystemMessage);
    this.chats.mainChat = this.chatServiceFactory('mainChat', {
      systemMessages: [{ role: 'system', content: compiled }],
    });
    const mainChat = this.chats.mainChat;
    const answer = await mainChat.sendMessage({
      role: 'system',
      content: `Tu est le maitre du jeu, lance le début de l'histoire pour les joueurs.
        Tout ce que tu dis est important soit pour l'histoire soit pour l'ambiance.
        Les joueurs n'ont pas lue ce qui précède ce message.
        Les joueurs t'écoute.`,
      // userId: process.env.BOT_ID,
    });
    this.audioStreamGateway.sendText(answer);
    this.saveGame();
  }

  /**
   * save current chat messages to chats/chatName file.
   */
  saveGame() {
    // check if chats folder exists
    if (!existsSync('chats')) {
      mkdirSync('chats');
    }
    writeFileSync(
      `chats/${this.currentGameName}.json`,
      JSON.stringify(
        Object.entries(this.chats).reduce((acc, [chatName, chat]) => {
          acc[chatName] = chat.get();
          return acc;
        }, {}),
        null,
        2,
      ),
    );

    if (!existsSync('games')) {
      mkdirSync('games');
    }
    writeFileSync(
      `games/${this.currentGameName}.json`,
      JSON.stringify({}, null, 2),
    );
  }

  /**
   * load chat messages by name in chats/chatName file.
   */
  loadGame() {
    // check if chats folder exists
    if (!existsSync('chats')) {
      mkdirSync('chats');
    }
    // check if chat file exists
    if (!existsSync(`chats/${this.currentGameName}.json`)) {
      this.createGame();
      return;
    }
    const chats = JSON.parse(
      readFileSync(`chats/${this.currentGameName}.json`, 'utf-8'),
    );
    Object.entries(chats).map(
      ([chatName, chat]: [string, ChatServiceFactoryChats]) => {
        this.chats[chatName] = this.chatServiceFactory(chatName, chat);
      },
    );

    // check if games folder exists
    if (!existsSync('games')) {
      mkdirSync('games');
    }
    // check if game file exists
    if (!existsSync(`games/${this.currentGameName}.json`)) {
      this.createGame();
      return;
    }
    const game = JSON.parse(
      readFileSync(`games/${this.currentGameName}.json`, 'utf-8'),
    );
    Object.entries(game).map(([key, value]: [string, unknown]) => {
      this.gameState[key] = value;
    });
  }
}
