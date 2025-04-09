import { Module } from '@nestjs/common';
import { OpenAiService } from './open-ai/open-ai.service';
import { ChatServiceFactory } from './chatServiceFactory';

@Module({
  providers: [
    OpenAiService,
    {
      provide: 'ChatServiceFactory',
      useFactory: (openAiService: OpenAiService) =>
        new ChatServiceFactory(openAiService),
      inject: [OpenAiService],
    },
  ],
  exports: ['ChatServiceFactory'],
})
export class ChatModule {}
