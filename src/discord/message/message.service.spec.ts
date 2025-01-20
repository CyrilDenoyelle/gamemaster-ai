import { Test, TestingModule } from '@nestjs/testing';
import { MessageService } from './message.service';
import { CommandModule } from './command/command.module';

describe('MessageService', () => {
  let service: MessageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CommandModule],
      providers: [MessageService],
    }).compile();

    service = module.get<MessageService>(MessageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
