import { Module } from '@nestjs/common';
import { CommandService } from './command.service';
import { CommandLoader } from './command-loader.service';

@Module({
  providers: [CommandService, CommandLoader],
  exports: [CommandService],
})
export class CommandModule {}
