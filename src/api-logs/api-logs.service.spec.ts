import { Test, TestingModule } from '@nestjs/testing';
import { ApiLogsService } from './api-logs.service';

describe('ApiLogsService', () => {
  let service: ApiLogsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ApiLogsService],
    }).compile();

    service = module.get<ApiLogsService>(ApiLogsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
