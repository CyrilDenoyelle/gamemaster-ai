import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { AudioStreamGateway } from 'src/audiostream/audiostream.gateway';
import {
  ChatService,
  ChatServiceArgs,
  restrictedChatMessage,
} from 'src/chat/chat.service';
import { ChatServiceFactory } from 'src/chat/ChatServiceFactory';
import { GameGateway } from './game.gateway';

export type Game = {
  gameName: string;
  gameState?: { [key: string]: unknown };
  chats?: { [key: string]: ChatServiceArgs };
  mainChat?: ChatServiceArgs;
};
@Injectable()
export class GameService {
  private gameState: { [key: string]: unknown } = {};
  private mainChat: ChatService;
  private chats: { [key: string]: ChatService } = {};
  private gameName: string;
  constructor(
    gameData: Game,
    private saveGame: () => void,
    @Inject(forwardRef(() => AudioStreamGateway))
    private audioStreamGateway: AudioStreamGateway,
    @Inject('ChatServiceFactory')
    private chatServiceFactory: ChatServiceFactory,
    @Inject(forwardRef(() => GameGateway))
    private gameGateway: GameGateway,
  ) {
    this.gameState = gameData.gameState || {};
    this.gameName = gameData.gameName;

    if (!gameData.mainChat) {
      this.createGame();
    } else {
      this.mainChat = this.chatServiceFactory.create(gameData.mainChat);
      Object.entries(gameData.chats || {}).map(([chatName, chat]) => {
        this.chats[chatName] = this.chatServiceFactory.create(chat);
      });
    }

    this.gameGateway.sendGame();
  }

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
   * send message to chat.
   */
  async sendMessage(message: restrictedChatMessage) {
    this.gameGateway.sendGame();
    if (this.mainChat) {
      const answer = await this.mainChat.sendMessage(message);
      this.gameGateway.sendGame();
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

    this.chats.nom1 = this.chatServiceFactory.create({
      systemMessages: sys(
        `prénom masculin qui pourrait correspondre au genre "${this.gameState.genre}", pas de nom de personnage très connu de ce genre`,
      ),
    });
    this.gameState.nom1 = await this.chats.nom1.randomSuggestion();

    this.chats.descriptionPersonnages = this.chatServiceFactory.create({
      systemMessages: sys(
        `Donne-moi deux courtes descriptions de "${this.gameState.nom1}" en deux lignes, pour un univers du genre "${this.gameState.genre}". Indique son rôle, équipement et un trait de caractère marquant qui pourrait influencer ses décisions.`,
      ),
    });
    this.gameState.descriptionPersonnages =
      await this.chats.descriptionPersonnages.randomSuggestion(); // todo use sendMessage
    this.chats.objectif = this.chatServiceFactory.create({
      systemMessages: sys(
        `Invente-moi un objectif principal typique pour une session JDR, style "${this.gameState.genre}".
Avec des rebondissements imprévus si nécessaire.
Juste le texte, pas de titre.`,
      ),
    });
    this.gameState.objectif = await this.chats.objectif.randomSuggestion();

    this.chats.firstGoal = this.chatServiceFactory.create({
      systemMessages: sys(
        `Génère un petit objectif immédiat qui plonge les joueurs dans l'ambiance de l'univers "${this.gameState.genre}".
Cet objectif de moyen terme doit être engageant et impliquer des actions concrètes.
Il ne doit pas révéler encore la mission principale mais plutôt installer le ton de l'aventure. Deux phrase.`,
      ),
    });
    this.gameState.firstGoal = await this.chats.firstGoal.randomSuggestion();

    const compiled = `Crée une histoire originale qui répond aux critères suivants :
Genre: ${this.gameState.genre}
${this.gameState.nom1}
Objectif: ${this.gameState.objectif}
${this.gameState.firstGoal}`;

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
    const chats: { [key: string]: ChatServiceArgs } = {
      ...Object.entries(this.chats).reduce((acc, [chatName, chat]) => {
        acc[chatName] = chat.get();
        return acc;
      }, {}),
    };
    return {
      gameName: this.gameName,
      gameState: this.gameState,
      chats,
      mainChat: this.mainChat ? this.mainChat.get() : {},
    };
  }
}
