import { Inject, Injectable } from '@nestjs/common';
import { Channel } from 'discord.js';
import {
  ChatService,
  ChatServiceArgs,
  restrictedChatMessage,
} from 'src/chat/chat.service';
import { ChatServiceFactory } from 'src/chat/chatServiceFactory';

export type Game = {
  channelId: Channel['id'];
  gameName: string;
  fileName: string;
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
  private fileName: string;
  private channelId: Channel['id'];
  constructor(
    gameData: Game,
    private saveGame: (channelId: Channel['id']) => void,
    @Inject('ChatServiceFactory')
    private chatServiceFactory: ChatServiceFactory,
  ) {
    this.gameState = gameData.gameState || {};
    this.gameName = gameData.gameName;
    this.fileName = gameData.fileName;
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

  private async creationPrompt(
    purpose: string,
    subject: string,
    min: number = 2,
    max: number = 3,
  ) {
    if (!this.chats[subject]) {
      this.chats[subject] = this.chatServiceFactory.create({
        systemMessages: [
          {
            role: 'system',
            content: `Tu es un assistant créatif pour les maîtres de jeu de rôle.`,
          },
        ],
      });
      await this.chats[subject].sendMessage({
        role: 'user',
        content: `Détermine les cinq éléments essentiels nécessaires pour "${purpose}".
Ces éléments doivent être génériques et applicables à divers contextes de jeu de rôle, sans fournir d'exemples spécifiques.`,
      });
      await this.chats[subject].sendMessage({
        role: 'user',
        content: `Organise ces idées dans un ordre logique pour les présenter aux joueurs, en allant du plus général au plus spécifique.`,
      });
    }
    // todo prompt : extrait les informations de ce prompt utilisateur qui pourrait être utile pour "${purpose}".
    const rawAnswer = await this.chats[subject].randomSuggestion(
      {
        role: 'user',
        content: `Génère une courte idée pour chaque élément de la liste. Juste le texte.${
          this.initPrompt
            ? `\nSi pertinent, prends en compte le prompt utilisateur suivant : "${this.initPrompt}"`
            : ''
        }`,
      },
      { min, max },
    );

    const questions = await this.chatServiceFactory.create({}).sendMessage({
      role: 'user',
      content: `Pose-moi quelques questions pour m'aider à "${purpose}", basé sur ces éléments:
"${rawAnswer}"
Uniquement une liste de questions.`,
    });

    this.chats[subject].sendMessage({
      role: 'user',
      content: questions,
    });

    return this.chats[subject].sendMessage({
      role: 'user',
      content: `Crée une nouvelle description narrative en intégrant également, si pertinent, tes réponses.`,
    });
  }

  /**
   * create game files.
   */
  async createGame() {
    // Je suis le joueurs, créer des idées basées sur ces éléments pour moi.
    // Une idée a la foi, pour que les valide.
    // Quand tu a toute les information met "c'est parti!" a la fin du texte.

    // Univers Creation
    this.gameState.univers = await this.creationPrompt(
      `créer un univers et immerger les joueurs`,
      `univers`,
    );

    this.gameState.universResume = await this.chats.univers.sendMessage({
      role: 'user',
      content: `Résume l'univers en quelques phrases.`,
    });

    // Character Creation
    this.gameState.characters = await this.creationPrompt(
      `créer un personnage unique et mémorable, qui partirait à l'aventure dans cet univers:
"${this.gameState.universResume}"`,
      `characters`,
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

    const generatedGameName = await this.chatServiceFactory
      .create({})
      .sendMessage({
        role: 'system',
        content: `L'univers :
${this.gameState.univers}


Les personnages :
${this.gameState.characters}

Invente un court nom pour cette partie de jeu de rôle.
Réponds-moi juste avec le nom de la partie. Pas d'extension, pas de caractères spéciaux.`,
      });

    this.rename(generatedGameName);

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
      fileName: this.fileName,
      chats,
      mainChat: this.mainChat ? this.mainChat.get() : {},
    };
  }

  rename(newName: string) {
    this.gameName = newName;
    this.fileName = newName.replace(/[^a-z0-9]/gi, '_');
    return this.fileName;
  }
}
