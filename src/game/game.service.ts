import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Chat } from 'openai/resources';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { AudioStreamGateway } from 'src/audiostream/audiostream.gateway';
import { ChatService, ChatServiceArgs } from 'src/chat/chat.service';
import { ChatServiceFactory } from 'src/chat/ChatServiceFactory';
import { GameGateway } from './game.gateway';
// import { OpenAiService } from 'src/chat/open-ai/open-ai.service';

type restrictedChatMessage =
  | Chat.ChatCompletionUserMessageParam
  | Chat.ChatCompletionSystemMessageParam
  | Chat.ChatCompletionAssistantMessageParam;

type Game = {
  gameState?: { [key: string]: unknown };
  chats?: { [key: string]: ChatServiceArgs };
  mainChat?: ChatServiceArgs;
};
@Injectable()
export class GameService {
  currentGameName: string;

  private gameState: { [key: string]: unknown } = {};
  private mainChat: ChatService;
  private chats: { [key: string]: ChatService } = {};
  constructor(
    // @Inject(forwardRef(() => OpenAiService))
    // private openAiService: OpenAiService,
    @Inject(forwardRef(() => AudioStreamGateway))
    private audioStreamGateway: AudioStreamGateway,
    @Inject('ChatServiceFactory')
    private chatServiceFactory: ChatServiceFactory,
    @Inject(forwardRef(() => GameGateway))
    private gameGateway: GameGateway,
  ) {}

  chatOrCreate(name: string, prompt?: string): ChatService {
    if (!this.chats[name]) {
      this.chats[name] = this.chatServiceFactory.create({
        systemMessages: [
          {
            role: 'system',
            content: prompt,
          },
        ],
      });
    }
    return this.chats[name];
  }

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
    this.saveGame();
    if (this.mainChat) {
      const answer = await this.mainChat.sendMessage(message);
      this.saveGame();
      this.audioStreamGateway.sendText(answer.replace(/\*/g, ''));
    }
  }

  /**
   * create game files.
   */
  async createGame() {
    const sys = (
      prompt: string,
    ): {
      role: restrictedChatMessage['role'];
      content: string;
    }[] => [
      {
        role: 'system',
        content: prompt,
      },
    ];

    this.chats.genre = this.chatServiceFactory.create({
      systemMessages: sys(
        `genres d'univers adaptés à du jeu de rôle en quelques mots`,
      ),
    });
    this.gameState.genre = await this.chats.genre.randomSuggestion();

    this.chats.ambiance = this.chatServiceFactory.create({
      systemMessages: sys(
        `Style d'ambiance générale adapté à du jeu de rôle pour un univers "${this.gameState.genre}"`,
      ),
    });
    this.gameState.ambiance = await this.chats.ambiance.randomSuggestion();

    this.chats.descriptionUnivers = this.chatServiceFactory.create({
      systemMessages: sys(
        `Décris en trois phrases un univers de genre "${this.gameState.genre}" avec une ambiance "${this.gameState.ambiance}". Inclue un lieu emblématique, une particularité marquante et l'atmosphère générale.`,
      ),
    });
    this.gameState.descriptionUnivers =
      await this.chats.descriptionUnivers.randomSuggestion();

    this.chats.nom1 = this.chatServiceFactory.create({
      systemMessages: sys(
        `prénom masculin qui pourrait correspondre au genre "${this.gameState.genre}", pas de nom de personnage très connu de ce genre`,
      ),
    });
    this.gameState.nom1 = await this.chats.nom1.randomSuggestion();

    this.chats.nom2 = this.chatServiceFactory.create({
      systemMessages: sys(
        `prénom féminin qui pourrait correspondre au genre "${this.gameState.genre}", pas de nom de personnage très connu de ce genre`,
      ),
    });
    this.gameState.nom2 = await this.chats.nom2.randomSuggestion();

    this.chats.descriptionPersonnages = this.chatServiceFactory.create({
      systemMessages: sys(
        `Donne-moi deux courtes descriptions de "${this.gameState.nom1}" et "${this.gameState.nom2}" en deux lignes chacune, pour un univers du genre "${this.gameState.genre}". Indique leur rôle, équipement et un trait de caractère marquant qui pourrait influencer leurs décisions.`,
      ),
    });
    this.gameState.descriptionPersonnages =
      await this.chats.descriptionPersonnages.randomSuggestion(); // todo use sendMessage
    this.chats.objectif = this.chatServiceFactory.create({
      systemMessages: sys(
        `Invente-moi un objectif principal typique pour une session JDR, style "${this.gameState.genre}, ${this.gameState.ambiance}".
Avec des rebondissements imprévus si nécessaire.
Juste le texte, pas de titre.`,
      ),
    });
    this.gameState.objectif = await this.chats.objectif.randomSuggestion();

    this.chats.motivationsPersonnages = this.chatServiceFactory.create({
      systemMessages: sys(
        `Voici l'objectif: ${this.gameState.objectif}
Voici les personnages:
${this.gameState.descriptionPersonnages}
Donne une raison unique et différente pour chaque personnage expliquant pourquoi il veut atteindre cet objectif. 2 lignes. Juste le texte.`,
      ),
    });
    this.gameState.motivationsPersonnages =
      await this.chats.motivationsPersonnages.randomSuggestion();

    this.chats.objectifTitle = this.chatServiceFactory.create({
      systemMessages: sys(
        `Génère un titre clair et concis pour cet objectif: "${this.gameState.objectif}".
Ce titre doit résumer précisément la mission et contenir un verbe d'action.
Pas d'effets de style inutiles, juste un titre fonctionnel qui indique directement l'objectif.`,
      ),
    });
    this.gameState.objectifTitle =
      await this.chats.objectifTitle.randomSuggestion();

    this.chats.firstGoal = this.chatServiceFactory.create({
      systemMessages: sys(
        `Génère un petit objectif immédiat qui plonge les joueurs dans l'ambiance de l'univers "${this.gameState.genre}" avec une atmosphère "${this.gameState.ambiance}".
Cet objectif de moyen terme doit être engageant et impliquer des actions concrètes.
Il ne doit pas révéler encore la mission principale mais plutôt installer le ton de l'aventure. Deux phrase.`,
      ),
    });
    this.gameState.firstGoal = await this.chats.firstGoal.randomSuggestion();

    const compiled = `Crée une histoire originale qui répond aux critères suivants :
Genre: ${this.gameState.genre}
Ambiance: ${this.gameState.ambiance}
${this.gameState.nom1}
${this.gameState.nom2}
Cadre: ${this.gameState.descriptionUnivers}
Personnages joueurs: ${this.gameState.descriptionPersonnages}
Objectif: ${this.gameState.objectif}
${this.gameState.objectifTitle}
${this.gameState.firstGoal}
Motivations des personnages: ${this.gameState.motivationsPersonnages}`;

    console.log('compiled', compiled);
    this.mainChat = this.chatServiceFactory.create({
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
      content: `Lance la partie de jeu de rôle pour les joueurs.
Présente leur l'univers, les personnages et l'objectif a court terme.`,
      // userId: process.env.BOT_ID,
    });
    this.audioStreamGateway.sendText(answer);

    this.saveGame();
  }

  getGame(): Game {
    if (!this.mainChat) return {};

    const chats: { [key: string]: ChatServiceArgs } = {
      ...Object.entries(this.chats).reduce((acc, [chatName, chat]) => {
        acc[chatName] = chat.get();
        return acc;
      }, {}),
    };
    return {
      gameState: this.gameState,
      chats,
      mainChat: this.mainChat.get(),
    };
  }

  /**
   * save current chat messages to chats/chatName file.
   */
  saveGame() {
    // check if chats folder exists
    if (!existsSync('chats')) {
      mkdirSync('chats');
    }
    const chats: { [key: string]: ChatServiceArgs } = {
      ...Object.entries(this.chats).reduce((acc, [chatName, chat]) => {
        acc[chatName] = chat.get();
        return acc;
      }, {}),
    };

    const save = {
      mainChat: this.mainChat.get(),
      ...chats,
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
    this.gameGateway.sendChats();
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
    this.mainChat = this.chatServiceFactory.create(chats.mainChat);
    Object.entries({ ...chats })
      .filter(([n]) => n !== 'mainChat')
      .map(([chatName, chat]: [string, ChatServiceArgs]) => {
        this.chats[chatName] = this.chatServiceFactory.create(chat);
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
    this.gameGateway.sendChats();
  }
}
