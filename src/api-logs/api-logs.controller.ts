import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiLogsService } from './api-logs.service';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { CreateApiLogDto } from './dto/create-api-log.dto';

@UseGuards(JwtAuthGuard)
@Controller('api-logs')
export class ApiLogsController {
  constructor(private readonly apiLogsService: ApiLogsService) {}

  @Get()
  findAll(@Query() searchDto: CreateApiLogDto) {
    return this.apiLogsService.findAll(searchDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.apiLogsService.findOne(id);
  }
}
