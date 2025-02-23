import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Chat } from 'openai/resources';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { PromptCompilerService } from 'src/prompt-compiler/prompt-compiler.service';
import { AudioStreamGateway } from 'src/audiostream/audiostream.gateway';
import { ChatService, ChatServiceArgs } from 'src/chat/chat.service';
import { CreativeChatService } from 'src/chat/creativChat.service';
import { ChatServiceFactory } from 'src/chat/ChatServiceFactory';

type restrictedChatMessage =
  | Chat.ChatCompletionUserMessageParam
  | Chat.ChatCompletionSystemMessageParam
  | Chat.ChatCompletionAssistantMessageParam;

@Injectable()
export class GameService {
  currentGameName: string;
  initialSystemMessage: string = `Crée une histoire immersive et originale qui répond aux critères suivants :
Genre: setget(genre|random(prompt(une liste, les éléments séparés par des pipes, de genres d'univers adaptés à du jeu de rôle, juste la liste))).
Ambiance: setget(ambiance|random(prompt(une liste, les éléments séparés par des pipes, de styles d'ambiances générales adaptés à du jeu de rôle pour un univers "get(genre)", juste la liste.))).
set(nom1|random(prompt(une liste, les éléments séparés par des pipes, de prénoms masculins qui pourraient correspondre au genre "get(genre)", pas de noms de personnages très connus de ce genre. Juste la liste)))
set(nom2|random(prompt(une liste, les éléments séparés par des pipes, de prénoms féminins qui pourraient correspondre au genre "get(genre)", pas de noms de personnages très connus de ce genre. Juste la liste)))
Cadre: setget(descriptionUnivers|prompt(Décris en trois phrases un univers de genre "get(genre)" avec une ambiance "get(ambiance)". Inclue un lieu emblématique, une particularité marquante et l'atmosphère générale.).)
Personnages joueurs: setget(descriptionPersonnages|prompt(Donne-moi deux courtes descriptions de "get(nom1)" et "get(nom2)" en deux lignes chacune, pour un univers du genre "get(genre)". Indique leur rôle, équipement et un trait de caractère marquant qui pourrait influencer leurs décisions.))
Objectif: setget(objectif|prompt(Invente-moi un objectif principal typique pour une session JDR, style "get(genre), get(ambiance)". Avec des rebondissements imprévus si nécessaire. Juste le texte, pas de titre.))
set(objectifTitle|prompt(Génère un titre clair et concis pour cet objectif: "get(objectif)". Ce titre doit résumer précisément la mission et contenir un verbe d'action. Pas d'effets de style inutiles, juste un titre fonctionnel qui indique directement l'objectif.))
set(firstGoal|prompt(Génère un petit objectif immédiat qui plonge les joueurs dans l'ambiance de l'univers "get(genre)" avec une atmosphère "get(ambiance)". Cet objectif doit être simple mais engageant, et impliquer des actions concrètes à court terme. Il ne doit pas révéler encore la mission principale mais plutôt installer le ton de l'aventure. Deux phrase.))
Rebondissement: prompt(Décris un rebondissement qui change complètement la perception de l'objectif: "get(objectifTitle)", en lien avec "get(descriptionUnivers)". Il doit surprendre les personnages et les forcer à reconsidérer leur approche. Deux phrase.))
Motivations des personnages: setget(motivationsPersonnages|prompt(Voici l'objectif: get(objectif)\nVoici les personnages:\nget(descriptionPersonnages)\nDonne une raison unique et différente pour chaque personnage expliquant pourquoi il veut atteindre cet objectif. 2 lignes. Juste le texte.))`;

  private gameState: { [key: string]: unknown } = {};
  private mainChat: ChatService;
  private chats: { [key: string]: ChatService | CreativeChatService } = {};
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
    if (this.mainChat) {
      const answer = await this.mainChat.sendMessage(message);
      this.audioStreamGateway.sendText(answer.replace(/\*/g, ''));
    }
    this.saveGame();
  }

  /**
   * create game files.
   */
  async createGame() {
    const { promptResult: compiled, objectResult } =
      await this.promptCompiler.exec(this.initialSystemMessage);
    console.log('compiled', compiled);
    this.gameState = objectResult;
    this.mainChat = this.chatServiceFactory.create('default', {
      systemMessages: [
        { role: 'system', content: compiled },
        {
          role: 'system',
          content: `Tu es le maître du jeu.
Ton rôle est d'être le narrateur et d'incarner l'univers ainsi que les personnages non-joueurs.

**Ne prends jamais de décision à la place des joueurs.**
**Ne décris jamais leurs actions, pensées ou dialogues.**
**Si une incertitude existe sur leurs choix, pose-leur la question au lieu de décider à leur place.**

Tout ce que tu dis doit: soit faire avancer l'histoire, soit renforcer l'ambiance.
Fait vivre l'histoire aux joueurs de manière immersive et guide-les naturellement vers leur objectif actuel.`,
        },
      ],
    });
    const mainChat = this.mainChat;
    const answer = await mainChat.sendMessage({
      role: 'system',
      content: `lance le début de l'histoire pour les joueurs.`,
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
    const save = {
      mainChat: this.mainChat?.get(),
      ...Object.entries(this.chats).reduce((acc, [chatName, chat]) => {
        acc[chatName] = chat.get();
        return acc;
      }, {}),
    };
    writeFileSync(
      `chats/${this.currentGameName}.json`,
      JSON.stringify(save, null, 2),
    );

    if (!existsSync('games')) {
      mkdirSync('games');
    }
    writeFileSync(
      `games/${this.currentGameName}.json`,
      JSON.stringify({ ...this.gameState }, null, 2),
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
    this.mainChat = this.chatServiceFactory.create('default', chats.mainChat);
    Object.entries({ ...chats })
      .filter(([n]) => n !== 'mainChat')
      .map(([chatName, chat]: [string, ChatServiceArgs]) => {
        this.chats[chatName] = this.chatServiceFactory.create('default', chat);
      });

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
