import { AudioStreamGateway } from 'src/audiostream/audiostream.gateway';
import { ChatServiceFactory } from 'src/chat/ChatServiceFactory';
import { GameGateway } from './game.gateway';
import { Game, GameService } from './game.service';
import { type restrictedChatMessage } from 'src/chat/chat.service';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { forwardRef, Inject, Logger } from '@nestjs/common';
// import { ChatServiceArgs } from 'src/chat/chat.service';
import { writeFileSync } from 'fs';

export class GameServiceFactory {
  private readonly logger = new Logger(GameServiceFactory.name);
  games: Map<string, Game> = new Map(); // gameName -> GameService
  guildId: string;
  storageFolder = './games';
  currentGame: GameService;
  constructor(
    @Inject(forwardRef(() => AudioStreamGateway))
    private audioStreamGateway: AudioStreamGateway,
    @Inject(forwardRef(() => 'ChatServiceFactory'))
    private chatServiceFactory: ChatServiceFactory,
    private gameGateway: GameGateway,
  ) {
    // guildId: string
    this.logger.log('games', this.games);
  }

  setGuildId(guildId: string) {
    this.guildId = guildId;
  }

  newGame(initPrompt?: string): GameService {
    if (this.currentGame) {
      this.saveGames(); // Save the current game before replacing it
    }

    const newGameName = `game_${new Date().toISOString().replace(/[:.]/g, '-')}`;
    this.create({
      gameName: newGameName,
      ...{ initPrompt },
    });
    const newGame = this.currentGame.getGame();
    this.games.set(newGame.gameName, newGame);
    return this.currentGame;
  }

  create(game: Game): GameService {
    this.currentGame = new GameService(
      game,
      this.saveGames.bind(this),
      this.audioStreamGateway,
      this.chatServiceFactory,
      this.gameGateway,
    );
    this.games.set(game.gameName, game);
    return this.currentGame;
  }

  getGame(): Game {
    if (!this.currentGame) {
      return null;
    }
    return this.currentGame.getGame();
  }

  getGames(): string[] {
    return Array.from(this.games.keys());
  }

  public async loadGamesFromStorage() {
    if (!existsSync(this.storageFolder)) {
      mkdirSync(this.storageFolder);
    }
    const guildFolder = join(this.storageFolder, this.guildId);
    if (!existsSync(guildFolder)) {
      mkdirSync(guildFolder);
    }
    if (readdirSync(guildFolder).length === 0) {
      this.newGame();
      const game = this.currentGame.getGame();
      this.games.set(game.gameName, game);
      return;
    }

    const files = readdirSync(guildFolder)
      .map((file) => ({
        file,
        mtime: statSync(join(guildFolder, file)).mtime,
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
      .map((f) => f.file);

    const lastGameFile = files[0];
    this.currentGame = this.create(
      JSON.parse(readFileSync(join(guildFolder, lastGameFile)).toString()),
    );

    files.forEach((file) => {
      const game = JSON.parse(readFileSync(join(guildFolder, file)).toString());
      this.games.set(file, game);
    });
  }

  public saveGames() {
    // save game to storage
    const guildFolder = join(this.storageFolder, this.guildId);
    const game = this.currentGame.getGame();
    const fileName = `${game.gameName}.json`;
    writeFileSync(join(guildFolder, fileName), JSON.stringify(game, null, 2));
    this.logger.log(`Game saved: ${fileName}`);
  }

  public async sendMessage(args: restrictedChatMessage) {
    await this.currentGame.sendMessage(args);
    this.saveGames();
  }
}
