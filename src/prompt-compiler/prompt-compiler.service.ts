import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { OpenAiService } from 'src/chat/open-ai/open-ai.service';

@Injectable()
export class PromptCompilerService {
  getRegex = () => /(\w+)\((?:([^()]+)\))/;
  objectResult = {};

  constructor(
    @Inject(forwardRef(() => OpenAiService))
    private openAiService: OpenAiService,
  ) {}
  async exec(
    prompt: string,
  ): Promise<{ promptResult: string; objectResult: Record<string, string> }> {
    this.objectResult = {};
    const recursiveReplace = async (str) => {
      const match = this.getRegex().exec(str);
      if (!match) {
        console.log('no match', str);
        return str;
      }
      const f = match[1];
      const args = match[2];
      if (typeof this[f] !== 'function') {
        console.log('------------------');
        console.log('no function', f);
        console.log('------------------');
      }
      str = str.replace(match[0], await this[f](args));
      return await recursiveReplace(str);
    };

    const promptResult = await recursiveReplace(prompt);
    return { promptResult, objectResult: this.objectResult };
  }

  private async set(arg: string) {
    const [key, value] = arg.split('|');
    this.objectResult[key] = value;
    return '';
  }

  private async setget(arg: string) {
    const [key, value] = arg.split('|');
    this.objectResult[key] = value;
    return value;
  }

  private async get(arg: string) {
    const [key] = arg.split('|');
    return this.objectResult[key];
  }

  private async random(args: string) {
    const [...arr] = args.split('|');
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private async prompt(args: string) {
    const [prompt] = args.split('|');
    return await this.openAiService.prompt(prompt);
  }
}
