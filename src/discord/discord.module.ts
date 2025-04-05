import { Module } from '@nestjs/common';
import { DiscordClientService } from './discord-client.service';
import { MessageModule } from './message/message.module';
import { CommandModule } from './command/command.module';
import { GameModule } from 'src/game/game.module';

@Module({
  imports: [MessageModule, CommandModule, GameModule],
  providers: [DiscordClientService],
})
export class DiscordModule {}
