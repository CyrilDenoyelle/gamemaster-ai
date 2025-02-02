import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { OpenAiService } from 'src/chat/open-ai/open-ai.service';

@Injectable()
export class PromptCompilerService {
  getRegex = () => /(\w+)\(((?:[^()]+|\((?:[^()]+|\([^()]*\))*\))*)\)/g;

  constructor(
    @Inject(forwardRef(() => OpenAiService))
    private openAiService: OpenAiService,
  ) {}
  async exec(prompt: string): Promise<string> {
    const recursiveReplace = async (str) => {
      const match = this.getRegex().exec(str);
      if (!match) {
        console.log('no match', str);
        return str;
      }
      const f = match[1];
      const args = await recursiveReplace(match[2]);
      if (typeof this[f] !== 'function') {
        console.log('------------------');
        console.log('no function', f);
        console.log('------------------');
      }
      str = str.replace(match[0], await this[f](args));
      return await recursiveReplace(str);
    };

    return await recursiveReplace(prompt);
  }

  private async set(arg) {
    const [key, value] = arg.split('|');
    this[key] = value;
    return '';
  }

  private async setget(arg) {
    const [key, value] = arg.split('|');
    this[key] = value;
    return value;
  }

  private async get(arg) {
    const [key] = arg.split('|');
    return this[key];
  }

  private async random(args) {
    const [...arr] = args.split('|');
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private async prompt(args) {
    const [prompt] = args.split('|');
    return await this.openAiService.prompt(prompt);
  }
}
