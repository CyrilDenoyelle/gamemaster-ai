import { ChatServiceFactory } from 'src/chat/ChatServiceFactory';
import { Game, GameService } from './game.service';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import { Channel, Message } from 'discord.js';
import { restrictedChatMessage } from 'src/chat/chat.service';

export class GameServiceFactory {
  private readonly logger = new Logger(GameServiceFactory.name);
  storageFolder = './games';
  currentGames: Map<string, GameService> = new Map(); // id: where game take place (userId or guildId) -> GameService: the game

  constructor(
    @Inject(forwardRef(() => 'ChatServiceFactory'))
    private chatServiceFactory: ChatServiceFactory,
  ) {}

  async newGame(
    channelId: Channel['id'],
    initPrompt?: string,
  ): Promise<{ gameService: GameService; gameName: string; message: string }> {
    const newGameName = `game_${new Date().toISOString().replace(/[:.]/g, '-')}`;
    const { game, message } = await this.create({
      channelId,
      gameName: newGameName,
      ...{ initPrompt },
    });

    this.currentGames.set(channelId, game);
    return { gameService: game, gameName: game.getGame().gameName, message };
  }

  async create(game: Game): Promise<{ game: GameService; message: string }> {
    const resp = { game: null, message: '' };
    const newGame = new GameService(
      game,
      this.saveCurrentGame.bind(this),
      this.chatServiceFactory,
    );
    resp.game = newGame;
    if (!game.mainChat) {
      resp.message = await newGame.createGame();
    }
    return resp;
  }

  getGame(channelId: Channel['id']): Game {
    if (!this.currentGames.has(channelId)) {
      return null;
    }
    return this.currentGames.get(channelId).getGame();
  }

  getGames(channelId: Channel['id'], search: string): string[] {
    if (!existsSync(this.storageFolder)) {
      mkdirSync(this.storageFolder);
    }
    // get games in file with channelId
    const channelIdFolder = join(this.storageFolder, channelId);
    if (!existsSync(channelIdFolder)) {
      mkdirSync(channelIdFolder);
    }

    return readdirSync(channelIdFolder)
      .map((file) => file.replace('.json', ''))
      .filter((game) => (search ? game.includes(search) : true));
  }

  /**
   * Fetches game file from storage for a specific channel. Load it in currentGames.
   * @param channelId The channel id.
   * @param gameName The name of the game to fetch. if provided, load the game.
   */
  public async loadGameFromStorage(
    channelId: Channel['id'],
    gameName?: string,
  ): Promise<{ message: string; status: string }> {
    if (!existsSync(this.storageFolder)) {
      mkdirSync(this.storageFolder);
    }
    const channelFolder = join(this.storageFolder, channelId);
    if (!existsSync(channelFolder)) {
      mkdirSync(channelFolder);
      return {
        message:
          'Aucune partie sauvegardée dans ce channel. Commencez une nouvelle partie avec: `!newgame <prompt>`',
        status: 'error',
      };
    }

    if (gameName) {
      const gameFile = join(channelFolder, gameName);
      if (!existsSync(gameFile)) {
        return {
          message: `Aucune partie "${gameFile}" trouvée.
Commencez une nouvelle partie avec: \`!newgame <prompt>\`
Ou affichez les parties sauvegardées dans ce channel avec: \`!showgames\``,
          status: 'error',
        };
      } else {
        const game = JSON.parse(readFileSync(gameFile).toString());
        const { game: loadedGame, message } = await this.create(game);
        this.currentGames.set(channelId, loadedGame); // load the game
        return {
          message: `Partie "${gameName}" chargée.${message ? `\n${message}` : ''}`,
          status: 'ok',
        };
      }
    }

    const games = readdirSync(channelFolder)
      .map((file) => ({
        file,
        mtime: statSync(join(channelFolder, file)).mtime,
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
      .map((f) => f.file);

    if (games.length === 0) {
      return {
        message:
          'Aucune partie sauvegardée dans ce channel. Commencez une nouvelle partie avec: `!newgame <prompt>`',
        status: 'error',
      };
    }

    console.log('games', games);
    const { game: loadedGame } = await this.create(
      JSON.parse(readFileSync(join(channelFolder, games[0])).toString()),
    );
    const name = games[0].replace('.json', '');
    this.currentGames.set(channelId, loadedGame);

    return {
      message: `Partie "${name}" chargée.`,
      status: 'ok',
    };
  }

  public saveCurrentGame(channelId: Channel['id']) {
    // save game to storage
    const channelFolder = join(this.storageFolder, channelId);
    if (!this.currentGames.has(channelId)) {
      return;
    }
    const game = this.currentGames.get(channelId).getGame();
    const fileName = `${game.gameName}.json`;
    writeFileSync(join(channelFolder, fileName), JSON.stringify(game, null, 2));
    this.logger.log(`Game saved: ${fileName}`);
  }

  public renameGame(channelId: Channel['id'], newName: string) {
    const game = this.currentGames.get(channelId);
    const oldName = game.getGame().gameName;
    game.rename(newName);
    this.saveCurrentGame(channelId);
    // delete old game file
    const channelFolder = join(this.storageFolder, channelId);
    const oldGameFile = join(channelFolder, `${oldName}.json`);
    if (existsSync(oldGameFile)) {
      unlinkSync(oldGameFile);
    }
    return game;
  }

  // used for voice messages
  public async sendMessage(
    channelId: Channel['id'],
    message: restrictedChatMessage,
  ) {
    const answer = await this.currentGames.get(channelId).sendMessage(message);
    this.saveCurrentGame(channelId);
    return answer;
  }

  public async sendDiscordMessage(message: Message, retry: number = 0) {
    if (retry > 2) {
      return "Une erreur s'est produite lors du chargment de la partie.";
    }
    if (!this.currentGames.has(message.channel.id)) {
      const { status, message: msg } = await this.loadGameFromStorage(
        message.channel.id,
      );
      if (status === 'error') {
        return msg;
      }
      const resp = await this.sendDiscordMessage(message, retry + 1);
      return `${msg}:\n${resp}`;
    }

    const answer = await this.currentGames.get(message.channel.id).sendMessage({
      role: 'user',
      content: message.content,
    });
    this.saveCurrentGame(message.channel.id);
    return answer;
  }
}
