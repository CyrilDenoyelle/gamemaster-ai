import { forwardRef, Module } from '@nestjs/common';
import { PromptCompilerService } from './prompt-compiler.service';
import { GameModule } from 'src/game/game.module';

@Module({
  imports: [forwardRef(() => GameModule)],
  providers: [PromptCompilerService],
  exports: [PromptCompilerService],
})
export class PromptCompilerModule {}
