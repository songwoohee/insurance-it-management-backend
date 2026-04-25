import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
} from '@nestjs/common';
import { ApiConfigsService } from './api-configs.service';
import { CreateApiConfigDto } from './dto/create-api-config.dto';
import { UpdateApiConfigDto } from './dto/update-api-config.dto';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';

interface AuthRequest extends Request {
  user: {
    userId: string;
  };
}

@UseGuards(JwtAuthGuard)
@Controller('api-configs')
export class ApiConfigsController {
  constructor(private readonly apiConfigsService: ApiConfigsService) {}

  /* 외부 기관 api 요청 */
  @Post(':id/request')
  async run(@Param('id') id: string, @Request() req: AuthRequest) {
    // 서비스 호출 (로그인한 유저의 ID와 인터페이스 ID를 넘김)
    return await this.apiConfigsService.runInterface(id, req.user.userId);
  }

  /* 실패한 로그 재처리 실행 */
  @Post('logs/:logId/retry')
  async retry(@Param('logId') logId: string, @Request() req: AuthRequest) {
    return await this.apiConfigsService.retryInterface(logId, req.user.userId);
  }

  /* api 등록 */
  @Post()
  create(
    @Body() createApiConfigDto: CreateApiConfigDto,
    @Request() req: AuthRequest,
  ) {
    return this.apiConfigsService.create(createApiConfigDto, req.user.userId);
  }

  /* api 목록 가져오기 */
  @Get()
  findAll() {
    return this.apiConfigsService.findAll();
  }

  /* api 상세 내용 가져오기 */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.apiConfigsService.findOne(id);
  }

  /* api 수정 */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateApiConfigDto: UpdateApiConfigDto,
    @Request() req: AuthRequest,
  ) {
    return this.apiConfigsService.update(
      id,
      updateApiConfigDto,
      req.user.userId,
    );
  }

  /* api 삭제 */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.apiConfigsService.remove(id);
  }
}
