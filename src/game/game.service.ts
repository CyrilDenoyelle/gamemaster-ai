import { Inject, Injectable } from '@nestjs/common';
import { Channel } from 'discord.js';
import {
  ChatService,
  ChatServiceArgs,
  restrictedChatMessage,
} from 'src/chat/chat.service';
import { ChatServiceFactory } from 'src/chat/ChatServiceFactory';

export type Game = {
  channelId: Channel['id'];
  gameName: string;
  initPrompt?: string;
  gameState?: { [key: string]: unknown };
  chats?: { [key: string]: ChatServiceArgs };
  mainChat?: ChatServiceArgs;
};
@Injectable()
export class GameService {
  private gameState: { [key: string]: unknown } = {};
  private mainChat: ChatService;
  private initPrompt?: string;
  private chats: { [key: string]: ChatService } = {};
  private gameName: string;
  private channelId: Channel['id'];
  constructor(
    gameData: Game,
    private saveGame: (channelId: Channel['id']) => void,
    @Inject('ChatServiceFactory')
    private chatServiceFactory: ChatServiceFactory,
  ) {
    this.gameState = gameData.gameState || {};
    this.gameName = gameData.gameName;
    this.initPrompt = gameData.initPrompt;
    this.channelId = gameData.channelId;

    if (gameData.mainChat) {
      this.mainChat = this.chatServiceFactory.create(gameData.mainChat);
      Object.entries(gameData.chats || {}).map(([chatName, chat]) => {
        this.chats[chatName] = this.chatServiceFactory.create(chat);
      });
    }
  }

  /**
   * send message to chat.
   */
  async sendMessage(message: restrictedChatMessage) {
    if (this.mainChat) {
      const answer = await this.mainChat.sendMessage(message);
      return answer;
    }
    return 'En attente du chat principal';
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
    // Je suis le joueurs, créer des idées basées sur ces éléments pour moi.
    // Une idée a la foi, pour que les valide.
    // Quand tu a toute les information met "c'est parti!" a la fin du texte.

    // Univers Creation
    this.chats.universCreation = this.chatServiceFactory.create({
      systemMessages: sys(
        `Tu es un assistant expert en création d'univers pour les maîtres de jeu de rôle. `,
      ),
    });
    await this.chats.universCreation.sendMessage({
      role: 'user',
      content: `Identifie les six éléments fondamentaux permettant d'immerger les joueurs dans un nouvel univers.
Ces éléments doivent être génériques et adaptables à différents contextes de jeu, sans inclure d'exemples spécifiques.`,
    });

    await this.chats.universCreation.sendMessage({
      role: 'user',
      content: `Met les dans l'ordre dans le quel ces idées devraient être communiquées au(x) joueur(x), du plus global au plus précis.`,
    });

    this.gameState.univers = await this.chats.universCreation.randomSuggestion(
      {
        role: 'user',
        content: `Génère une courte idée pour chaque élément de la liste. Juste le texte.${this.initPrompt ? `\nSi pertinent, prends en compte le prompt utilisateur suivant: "${this.initPrompt}"` : ''}`,
      },
      { min: 3, max: 4 },
    );
    this.gameState.universResume = await this.chats.universCreation.sendMessage(
      {
        role: 'user',
        content: `Résume l'univers en quelques phrases.`,
      },
    );

    // Character Creation
    this.chats.characterCreation = this.chatServiceFactory.create({
      systemMessages: sys(
        `Tu es un assistant expert en création de personnages pour les maîtres de jeu de rôle.`,
      ),
    });
    await this.chats.characterCreation.sendMessage({
      role: 'user',
      content: `Identifie les six éléments fondamentaux permettant de créer un personnage unique et mémorables, qui partirait a l'aventure dans ce jeu de rôle.
Ces éléments doivent être génériques et adaptables à différents contextes de jeu, sans inclure d'exemples spécifiques.`,
      // créer le nombre de personnage donnés dans la commande de création de la game.
    });
    await this.chats.characterCreation.sendMessage({
      role: 'user',
      content: `Met les dans l'ordre dans le quel ces idées devraient être communiquées au(x) joueur(x), du plus global au plus précis.`,
    });
    this.gameState.characters =
      await this.chats.characterCreation.randomSuggestion(
        {
          role: 'user',
          content: `Pour chaque élément de la liste, génère une idée concise et uniquement textuelle.${this.initPrompt ? `\nSi pertinent, prends en compte le prompt utilisateur suivant : "${this.initPrompt}"` : ''}`,
        },
        { min: 3, max: 4 },
      );

    this.mainChat = this.chatServiceFactory.create({
      systemMessages: [
        {
          role: 'system',
          content: `Tu es le maître du jeu.
Ton rôle est d'être le narrateur et d'incarner l'univers ainsi que les personnages non-joueurs.

**Ne prends jamais de décision à la place des joueurs.**
**Ne décris jamais leurs actions, pensées ou dialogues.**
**Si une incertitude existe sur leurs choix, pose-leur la question au lieu de décider à leur place.**

Tout ce que tu dis doit: soit faire avancer l'histoire, soit renforcer l'ambiance.
Fait vivre l'histoire aux joueurs de manière immersive et guide-les naturellement vers leur objectif actuel.
Dis-leur les choses de façon symple.${this.initPrompt ? `\nSi pertinent, prends en compte le prompt utilisateur suivant : "${this.initPrompt}"` : ''}`,
        },
      ],
    });

    const answer = await this.mainChat.sendMessage(
      {
        role: 'system',
        content: `L'univers:
${this.gameState.univers}


Les personnages:
${this.gameState.characters}


Lance la partie de jeu de rôle pour les joueurs.
Présente leur l'univers, les personnages et l'objectif a court terme.`,
      },
      'systemMessages',
    );

    this.saveGame(this.channelId);
    return answer;
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
      channelId: this.channelId,
      gameState: this.gameState,
      chats,
      mainChat: this.mainChat ? this.mainChat.get() : {},
    };
  }

  rename(newName: string) {
    this.gameName = newName;
  }
}
