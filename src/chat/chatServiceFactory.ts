import { ChatService, ChatServiceArgs } from './chat.service';
import { OpenAiService } from './open-ai/open-ai.service';

export class ChatServiceFactory {
  constructor(private openAiService: OpenAiService) {}

  create(args: ChatServiceArgs): ChatService {
    return new ChatService(args, this.openAiService);
  }
}
