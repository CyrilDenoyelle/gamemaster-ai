import { Module } from '@nestjs/common';
import { DiscordClientService } from './discord-client.service';
import { MessageModule } from './message/message.module';

@Module({
  providers: [DiscordClientService],
  imports: [MessageModule],
})
export class DiscordModule {}
