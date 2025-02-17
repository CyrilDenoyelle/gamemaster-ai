import { Module } from '@nestjs/common';
import { OpenAiService } from './open-ai/open-ai.service';
import {
  ChatService,
  ChatServiceFactory,
  ChatServiceFactoryChats,
} from './chat.service';

@Module({
  providers: [
    OpenAiService,
    {
      provide: 'ChatServiceFactory',
      useFactory: (openAiService: OpenAiService): ChatServiceFactory => {
        return (name: string, args: ChatServiceFactoryChats) =>
          new ChatService(name, args, openAiService);
      },
      inject: [OpenAiService],
    },
  ],
  exports: ['ChatServiceFactory'],
})
export class ChatModule {}
