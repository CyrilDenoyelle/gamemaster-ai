import { ChatService, ChatServiceArgs } from './chat.service';
import {
  CreativeChatService,
  CreativeChatServiceArgs,
} from './creativChat.service';
import { OpenAiService } from './open-ai/open-ai.service';

export type ChatServiceType = 'default' | 'creative';

const instanceMap = {
  default: ChatService,
  creative: CreativeChatService,
};
// Service Map to associate types with their respective classes
interface ServiceMap {
  default: { args: ChatServiceArgs; instance: ChatService };
  creative: {
    args: CreativeChatServiceArgs;
    instance: CreativeChatService;
  };
}

export class ChatServiceFactory {
  constructor(private openAiService: OpenAiService) {}

  create<T extends keyof ServiceMap>(
    type: T,
    args: ServiceMap[T]['args'],
  ): ServiceMap[T]['instance'] {
    return new instanceMap[type](args, this.openAiService);
  }
}
