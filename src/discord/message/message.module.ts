import { Module } from '@nestjs/common';
import { MessageService } from './message.service';
import { CommandModule } from './command/command.module';
import { GameModule } from 'src/game/game.module';

@Module({
  imports: [CommandModule, GameModule],
  providers: [MessageService],
  exports: [MessageService],
})
export class MessageModule {}
