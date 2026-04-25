import { Test, TestingModule } from '@nestjs/testing';
import { ApiConfigsController } from './api-configs.controller';
import { ApiConfigsService } from './api-configs.service';

describe('ApiConfigsController', () => {
  let controller: ApiConfigsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiConfigsController],
      providers: [ApiConfigsService],
    }).compile();

    controller = module.get<ApiConfigsController>(ApiConfigsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
