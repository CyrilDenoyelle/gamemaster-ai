import { Injectable } from '@nestjs/common';
import { OpenAiService } from './open-ai/open-ai.service';
import {
  ChatService,
  ChatServiceArgs,
  restrictedChatMessage,
} from './chat.service';

export type CreativeChatServiceArgs = ChatServiceArgs & {
  readonly listMessages?: restrictedChatMessage[];
};

@Injectable()
export class CreativeChatService extends ChatService {
  listMessages: restrictedChatMessage[] = [];
  constructor(
    args: CreativeChatServiceArgs,
    protected readonly openAiService: OpenAiService,
  ) {
    super(args, openAiService);
    this.listMessages = args.listMessages || [];
  }

  /**
   * Send text to the chat
   * @param message The role of the user sending the text
   * @param content The text to send
   */
  async generate() {
    await this.shiftMessagesUntilWithinLimit();
    const listAnswer = await this.openAiService.sendChat([
      ...this.systemMessages,
      ...this.messages,
      {
        role: 'user',
        content: `Génère une liste de suggestions. Non numérotées.
Sépare chaque suggestion par un "|". Ne mets aucun texte supplémentaire.`,
      },
    ]);
    this.listMessages.push({
      role: 'assistant',
      content: listAnswer,
    });
    const list = listAnswer.split('|');
    // choose a random answer from the list of answers
    const answer = list[Math.floor(Math.random() * list.length)];
    // push the "please generate" message and the random answer
    this.push(
      { role: 'user', content: `Génère une suggestion.` },
      { role: 'assistant', content: answer },
    );

    return answer;
  }
}
