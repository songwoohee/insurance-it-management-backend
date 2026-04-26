import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiLogsService } from './api-logs.service';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { CreateApiLogDto } from './dto/create-api-log.dto';

@UseGuards(JwtAuthGuard)
@Controller('api-logs')
export class ApiLogsController {
  constructor(private readonly apiLogsService: ApiLogsService) {}

  @Get()
  async findAll(
    @Query() searchDto: CreateApiLogDto, // 기존 검색 조건들
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    return this.apiLogsService.findAll(searchDto, Number(page), Number(limit));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.apiLogsService.findOne(id);
  }
}
