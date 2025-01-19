import { Module } from '@nestjs/common';
import { DiscordClientService } from './discord-client.service';
import { CommandService } from './command/command.service';
import { CommandLoader } from './command/command-loader.service';

@Module({
  providers: [DiscordClientService, CommandService, CommandLoader],
})
export class DiscordModule {}
