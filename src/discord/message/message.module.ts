import { Module } from '@nestjs/common';
import { MessageService } from './message.service';
import { CommandModule } from './command/command.module';

@Module({
  imports: [CommandModule],
  providers: [MessageService],
  exports: [MessageService],
})
export class MessageModule {}
