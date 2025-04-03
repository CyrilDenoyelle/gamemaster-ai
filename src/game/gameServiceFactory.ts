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
  gamesFileName = 'current-games.json';
  currentGames: Map<string, GameService> = new Map(); // channel: where game take place -> GameService

  constructor(
    @Inject(forwardRef(() => 'ChatServiceFactory'))
    private chatServiceFactory: ChatServiceFactory,
  ) {
    if (!existsSync(this.storageFolder)) {
      mkdirSync(this.storageFolder);
    }
    const gamesFilePath = join(this.storageFolder, this.gamesFileName);
    if (!existsSync(gamesFilePath)) {
      writeFileSync(gamesFilePath, '[]');
    }
    const currentGames = JSON.parse(readFileSync(gamesFilePath).toString());

    (async () => {
      for await (const { channelId, fileName } of currentGames) {
        const gameFile = join(
          this.storageFolder,
          channelId,
          `${fileName}.json`,
        );
        if (!existsSync(gameFile)) {
          return;
        }
        const gameData = JSON.parse(readFileSync(gameFile).toString());
        const { game: gameService } = await this.create(gameData);
        this.set(gameData.channelId, gameService);
      }
    })();
  }

  async newGame(
    channelId: Channel['id'],
    initPrompt?: string,
  ): Promise<{ gameService: GameService; gameName: string; message: string }> {
    const newGameName = `game_${new Date().toISOString().replace(/[:.]/g, '-')}`;
    const { game, message } = await this.create({
      channelId,
      gameName: newGameName,
      fileName: newGameName,
      ...{ initPrompt },
    });

    this.set(channelId, game);
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
   * @param fileName The name of the game to fetch. if provided, load the game.
   */
  public async loadGameFromStorage(
    channelId: Channel['id'],
    fileName?: string,
  ): Promise<{ message: string; status: string }> {
    if (!existsSync(this.storageFolder)) {
      mkdirSync(this.storageFolder);
    }
    const channelFolder = join(this.storageFolder, channelId);
    if (!existsSync(channelFolder)) {
      mkdirSync(channelFolder);
      return {
        message:
          'Aucune partie sauvegardée dans ce channel. Commencez une nouvelle partie avec: `/newgame <prompt>`',
        status: 'error',
      };
    }

    if (fileName) {
      const gameFile = join(channelFolder, `${fileName}.json`);
      if (!existsSync(gameFile)) {
        return {
          message: `Aucune partie "${fileName}" trouvée.
Commencez une nouvelle partie avec: \`/newgame <prompt>\`
Ou affichez les parties sauvegardées dans ce channel avec: \`/showgames\``,
          status: 'error',
        };
      } else {
        const game: Game = JSON.parse(readFileSync(gameFile).toString());
        const { game: loadedGame, message } = await this.create(game);
        this.set(channelId, loadedGame); // load the game
        return {
          message: `Partie "${fileName}" chargée.${message ? `\n${message}` : ''}`,
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
          'Aucune partie sauvegardée dans ce channel. Commencez une nouvelle partie avec: `/newgame <prompt>`',
        status: 'error',
      };
    }

    console.log('games', games);
    const { game: loadedGame } = await this.create(
      JSON.parse(readFileSync(join(channelFolder, games[0])).toString()),
    );
    const name = games[0].replace('.json', '');
    this.set(channelId, loadedGame);

    return {
      message: `Partie "${name}" chargée.`,
      status: 'ok',
    };
  }

  async summarizeCurrentGame(channelId: Channel['id']) {
    if (!this.currentGames.has(channelId)) {
      return;
    }
    const game = this.currentGames.get(channelId);

    return this.chatServiceFactory.create({}).sendMessage({
      role: 'user',
      content: `Génère, en quelques lignes, un résumé de ces messages d'une partie de jeu de rôle, en commençant par nous rappeler qui nous sommes en tant que joueur(s).

"""
${game
  .getGame()
  .mainChat.messages.slice(-6)
  .map((m) => `${m.role}: ${m.content}`)
  .join('\n')}
"""`,
    });
  }

  public saveCurrentGame(channelId: Channel['id']) {
    // save game to storage
    const channelFolder = join(this.storageFolder, channelId);
    if (!this.currentGames.has(channelId)) {
      return;
    }
    const game = this.currentGames.get(channelId).getGame();
    const fileName = game.fileName
      ? `${game.fileName}.json`
      : `${game.gameName}.json`;

    if (!existsSync(channelFolder)) {
      mkdirSync(channelFolder, { recursive: true });
    }

    writeFileSync(join(channelFolder, fileName), JSON.stringify(game, null, 2));
    this.logger.log(`Game saved: ${fileName}`);
  }

  public pauseGame(channelId: Channel['id']) {
    this.saveCurrentGame(channelId);
    this.delete(channelId);
  }

  public renameGame(channelId: Channel['id'], newName: string) {
    const game = this.currentGames.get(channelId);
    const oldFileName = game.getGame().fileName;
    game.rename(newName);
    this.saveCurrentGame(channelId);
    // delete old game file
    const channelFolder = join(this.storageFolder, channelId);
    const oldGameFile = join(channelFolder, `${oldFileName}.json`);
    if (existsSync(oldGameFile)) {
      unlinkSync(oldGameFile);
    }
    return game;
  }

  private exportCurrentGamesToJson() {
    // Save the currentGames Map to a JSON file
    const games = Array.from(this.currentGames.entries()).map(
      ([channelId, gameService]) => ({
        channelId,
        fileName: gameService.getGame().fileName,
      }),
    );
    const serializedGames = JSON.stringify(games, null, 2);
    writeFileSync(
      join(this.storageFolder, this.gamesFileName),
      serializedGames,
    );
    this.logger.log('Current games saved');
  }

  private set(channelId: Channel['id'], loadedGame: GameService) {
    this.currentGames.set(channelId, loadedGame);
    this.exportCurrentGamesToJson();
  }

  private delete(channelId: Channel['id']) {
    this.currentGames.delete(channelId);
    this.exportCurrentGamesToJson();
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

  public async sendDiscordMessage(message: Message) {
    if (!this.currentGames.has(message.channel.id)) {
      return;
    }

    const answer = await this.currentGames.get(message.channel.id).sendMessage({
      role: 'user',
      content: message.content,
    });
    this.saveCurrentGame(message.channel.id);
    return answer;
  }
}
