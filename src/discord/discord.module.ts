import { Module } from '@nestjs/common';
import { DiscordClientService } from './discord-client.service';

@Module({
  providers: [DiscordClientService],
})
export class DiscordModule {}
