import { forwardRef, Module } from '@nestjs/common';
import { CommandService } from './command.service';
import { GameModule } from 'src/game/game.module';

@Module({
  imports: [forwardRef(() => GameModule)],
  providers: [CommandService],
  exports: [CommandService],
})
export class CommandModule {}
