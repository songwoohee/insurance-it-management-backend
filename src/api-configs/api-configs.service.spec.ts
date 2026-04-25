import { Test, TestingModule } from '@nestjs/testing';
import { ApiConfigsService } from './api-configs.service';

describe('ApiConfigsService', () => {
  let service: ApiConfigsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ApiConfigsService],
    }).compile();

    service = module.get<ApiConfigsService>(ApiConfigsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
