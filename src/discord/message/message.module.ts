import { Module } from '@nestjs/common';
import { MessageService } from './message.service';
import { GameModule } from 'src/game/game.module';

@Module({
  imports: [GameModule],
  providers: [MessageService],
  exports: [MessageService],
})
export class MessageModule {}
