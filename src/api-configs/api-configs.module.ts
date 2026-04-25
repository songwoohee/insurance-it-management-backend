import { Module } from '@nestjs/common';
import { ApiConfigsService } from './api-configs.service';
import { ApiConfigsController } from './api-configs.controller';
import { PrismaService } from 'src/prisma.service';
import { HttpModule } from '@nestjs/axios';
import { ApiConfigsBatchService } from './api-configs-batch.service';

@Module({
  imports: [HttpModule],
  controllers: [ApiConfigsController],
  providers: [ApiConfigsService, PrismaService, ApiConfigsBatchService],
})
export class ApiConfigsModule {}
