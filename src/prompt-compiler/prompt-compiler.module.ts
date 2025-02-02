import { forwardRef, Module } from '@nestjs/common';
import { PromptCompilerService } from './prompt-compiler.service';
import { ChatModule } from 'src/chat/chat.module';

@Module({
  imports: [forwardRef(() => ChatModule)],
  providers: [PromptCompilerService],
  exports: [PromptCompilerService],
})
export class PromptCompilerModule {}
