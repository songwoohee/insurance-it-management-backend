import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UploadedFiles,
  UseInterceptors,
  Res,
  Req,
  UseGuards,
  Query,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { FtpService } from './ftp.service';
import type { Response } from 'express';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('ftp')
export class FtpController {
  constructor(private readonly ftpService: FtpService) {}

  // FTP 설정 등록
  // POST /ftp/configs
  @Post('configs')
  async createConfig(
    @Body()
    body: {
      api_config_id: string;
      host: string;
      username: string;
      password: string;
      port?: number;
      remote_path?: string;
      secure?: boolean;
    },
  ) {
    return this.ftpService.createFtpConfig(body);
  }

  // 이미지 단건 & 다건 다운로드
  @Post('/bulk-download')
  async bulkDownload(
    @Body('correlationIds') correlationIds: string[],
    @Res() res: Response,
  ) {
    try {
      // 1. 이미지 API인지 검증 및 파일 정보 조회 (서비스에서 처리)
      const { stream, fileName } =
        await this.ftpService.bulkDownload(correlationIds);

      // 2. 헤더 설정
      res.set({
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Access-Control-Expose-Headers': 'Content-Disposition',
      });

      // 3. 스트림 에러 핸들링
      stream.on('error', (err) => {
        console.error('ZIP Stream Error:', err);
        if (!res.headersSent) res.status(500).end();
      });

      // 4. 스트림 전송
      stream.pipe(res);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        '다운로드 중 오류가 발생했습니다.',
      );
    }
  }

  // 연결 테스트
  // GET /ftp/:apiConfigId/test
  @Get(':apiConfigId/test')
  async testConnection(@Param('apiConfigId') apiConfigId: string) {
    return this.ftpService.testConnection(apiConfigId);
  }

  // 파일 업로드
  @Post(':apiConfigId/files')
  @UseInterceptors(FilesInterceptor('files')) // Files (복수형)
  async uploadFiles(
    @Param('apiConfigId') apiConfigId: string,
    @UploadedFiles() files: Express.Multer.File[], // Array 타입
    @Req() req: any,
  ): Promise<any> {
    return await this.ftpService.uploadFiles(
      apiConfigId,
      files,
      req.user.userId,
    );
  }

  // 파일 목록 가져오기
  @Get(':apiConfigId/files')
  async listFiles(
    @Param('apiConfigId') apiConfigId: string,
    @Req() req: any,
    @Query('requestGroupId') requestGroupId?: string,
  ) {
    const userId = req.user.userId;
    console.log('apiConfigId: ', apiConfigId);
    return await this.ftpService.listFiles(apiConfigId, userId, requestGroupId);
  }
}
