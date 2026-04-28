import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import * as ftp from 'basic-ftp';
import { ftp_configs } from '@prisma/client';
import * as fs from 'fs';
import { join } from 'path';
import archiver from 'archiver';
import { createReadStream, existsSync } from 'fs';

@Injectable()
export class FtpService {
  constructor(private readonly prisma: PrismaService) {
    // 서버 시작 시 폴더가 없으면 생성
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  // 프로젝트 루트의 uploads
  private readonly uploadPath = join(process.cwd(), 'uploads');

  /* [헬퍼] 이미지 전용 API 인지 검증 */
  private validateImage(apiConfigId: string): void {
    const IMAGE_API_CONFIG_ID = 'bff1ffd2-11a9-4e08-b2c9-f2862dcc6e32';

    if (apiConfigId !== IMAGE_API_CONFIG_ID) {
      // 400 Bad Request 에러와 함께 우희님이 원하신 메시지 전달
      throw new BadRequestException('이미지만 다운로드 가능합니다.');
    }
  }

  // ✅ Prisma로 FTP 설정 조회
  private async getFtpConfig(apiConfigId: string) {
    const config = await this.prisma.ftp_configs.findUnique({
      where: { api_config_id: apiConfigId },
    });
    if (!config) {
      throw new NotFoundException(
        `FTP config not found for api_config_id: ${apiConfigId}`,
      );
    }
    return config;
  }

  // ✅ Prisma로 FTP 설정 등록
  async createFtpConfig(body: {
    api_config_id: string;
    host: string;
    username: string;
    password: string;
    port?: number;
    remote_path?: string;
    secure?: boolean;
  }) {
    return this.prisma.ftp_configs.create({ data: body });
  }

  private async withClient<T>(
    apiConfigId: string,
    fn: (client: ftp.Client, config: ftp_configs) => Promise<T>,
  ): Promise<T> {
    const config = await this.getFtpConfig(apiConfigId);
    const client = new ftp.Client();
    client.ftp.verbose = process.env.NODE_ENV === 'development';
    try {
      await client.access({
        host: config.host,
        user: config.username,
        password: config.password,
        port: config.port ?? 21,
        secure: config.secure ?? false,
      });
      return await fn(client, config);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(`FTP Error: ${message}`);
    } finally {
      client.close();
    }
  }

  /* 1. 연결 테스트 */
  async testConnection(apiConfigId: string) {
    try {
      await this.withClient(apiConfigId, async (client, config) => {
        await client.list(config.remote_path ?? '/');
      });
      return { success: true, message: '연결 성공' };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, message };
    }
  }

  /* 업로드 시 함께 저장되는 묶음 ID 생성 함수 */
  private generateRequestGroupId(): string {
    const now = new Date();
    const datePart = now.toISOString().split('T')[0].replace(/-/g, ''); // 20260427
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase(); // 4자리 랜덤 문자
    return `${datePart}-${randomPart}`;
  }

  /* 2. [업로드] */
  async uploadFiles(
    apiConfigId: string,
    files: Express.Multer.File[],
    userId: string,
  ) {
    const startTime = Date.now();
    // 1. 이번 업로드 회차를 대표할 하나의 ID 생성
    const requestGroupId = this.generateRequestGroupId();
    const results: { originalName: string; correlationId: string | null }[] =
      [];

    // 전달받은 파일 배열을 하나씩 처리
    for (const file of files) {
      const correlationId = crypto.randomUUID();
      const storedName = `${Date.now()}_${file.originalname}`;
      const fullPath = join(this.uploadPath, storedName);

      // 실제 파일 저장
      fs.writeFileSync(fullPath, file.buffer);

      // 2. DB 로그 생성 (JSONB 컬럼 활용)
      const log = await this.prisma.api_logs.create({
        data: {
          api_configs: { connect: { id: apiConfigId } },
          users: { connect: { id: userId } },
          correlation_id: correlationId,
          request_group_id: requestGroupId,
          status: 'SUCCESS',
          status_code: '201',
          request_payload: {
            requestGroupId: requestGroupId,
            fileName: file.originalname,
            storedName: storedName, // 이 이름으로 저장했음을 기록
            size: file.size,
            mimetype: file.mimetype,
          },
          response_payload: {
            message: '파일이 서버 로컬 스토리지에 저장되었습니다.',
            url: `/uploads/${storedName}`,
          },
          execution_time_ms: Date.now() - startTime,
          requested_at: new Date(startTime),
          responded_at: new Date(),
        },
      });

      results.push({
        originalName: file.originalname,
        correlationId: log.correlation_id,
      });
    }

    return {
      success: true,
      requestGroupId: requestGroupId,
      totalCount: files.length,
      files: results,
    };
  }

  /*  3. [목록 조회] */
  async listFiles(
    apiConfigId: string,
    userId: string,
    requestGroupId?: string,
  ) {
    console.log('1. 요청받은 apiConfigId:', apiConfigId);
    console.log('2. 요청받은 requestGroupId:', requestGroupId);

    // 1. 일단 해당 그룹의 모든 로그를 가져옵니다.
    const allLogs = await this.prisma.api_logs.findMany({
      where: {
        status: 'SUCCESS',
        request_group_id: requestGroupId,
      },
      orderBy: { requested_at: 'desc' },
    });

    console.log('3. DB에서 찾은 전체 로그 개수:', allLogs.length);

    // 2. [핵심] '진짜 파일'만 골라냅니다.
    // (우희님이 주신 DB 데이터처럼 진짜 파일은 mimetype이 들어있습니다.)
    const realFiles = allLogs.filter((log) => {
      const payload = log.request_payload as any;
      return payload?.mimetype; // mimetype이 있는 로그만 진짜 파일로 간주
    });

    // 3. 진짜 파일들의 이름만 깔끔하게 합칩니다.
    const fileNames = realFiles
      .map((f) => (f.request_payload as any)?.fileName)
      .join(', ');

    const uploadListDisplay = `[${fileNames || '데이터 없음'}]`;

    // 4. 새로운 조회 보고서 로그 생성
    if (requestGroupId) {
      await this.prisma.api_logs.create({
        data: {
          status: 'SUCCESS',
          request_group_id: requestGroupId,
          users: { connect: { id: userId } },
          api_configs: { connect: { id: apiConfigId } },
          request_payload: {
            // 이 로그는 mimetype이 없으므로 다음번 조회(2번 단계)에서 자동으로 제외됩니다!
            '업로드 목록': uploadListDisplay,
          },
          requested_at: new Date(),
        },
      });
    }

    // 5. 화면에도 진짜 파일들만 보내줍니다.
    return realFiles.map((log) => ({
      name: (log.request_payload as any)?.fileName || 'Unknown File',
      date: log.requested_at,
      logId: log.id,
      requestGroupId: log.request_group_id,
    }));
  }

  /* 4. [단건 & 다건 압축 다운로드 서비스] */
  async bulkDownload(correlationIds: string[]) {
    // 1. DB 조회 (이미지 API 로그만 필터링)
    const logs = await this.prisma.api_logs.findMany({
      where: {
        correlation_id: { in: correlationIds },
      },
    });

    if (logs.length === 0) {
      throw new BadRequestException('다운로드 가능한 이미지가 없습니다.');
    }

    // 2. 헬퍼 함수로 검증 (모든 로그가 이미지 API인지 확인)
    // 만약 체크박스로 섞어서 보냈을 때 하나라도 이미지가 아니면 차단!
    for (const log of logs) {
      this.validateImage(log.api_config_id);
    }

    // 3. 압축 객체 생성
    const archive = archiver('zip', { zlib: { level: 7 } });
    const fileName = `Img_download_${new Date().toISOString().split('T')[0]}.zip`;

    for (const log of logs) {
      const payload = log.request_payload as any;
      const fullPath = join(this.uploadPath, payload?.storedName);

      if (existsSync(fullPath)) {
        archive.append(createReadStream(fullPath), { name: payload.fileName });
      }
    }

    // 4. 압축 마무리
    archive.finalize();

    return { stream: archive, fileName };
  }
}
