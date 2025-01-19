import { Module } from '@nestjs/common';
import { MessageService } from './message.service';
import { CommandModule } from './command/command.module';

@Module({
  providers: [MessageService],
  imports: [CommandModule],
  exports: [MessageService],
})
export class MessageModule {}
