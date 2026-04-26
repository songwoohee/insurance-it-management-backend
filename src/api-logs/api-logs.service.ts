import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateApiLogDto } from './dto/create-api-log.dto';
import { Prisma } from '@prisma/client';

/**
 * UI상의 상태 명칭을 DB 쿼리용 필터 조건으로 변환 (서버 사이드 필터링용)
 * @param displayStatus 사용자가 선택한 UI 상태 (예: '성공', '실패')
 */
function displayStatusToWhereFilter(displayStatus: string) {
  const map: Record<string, object> = {
    성공: { status: 'SUCCESS' },
    '최종 실패': { status: 'PERMANENT_FAIL' },
    '재처리 대기 중': { status: 'FAIL', retry_count: { lt: 3 } },
    실패: { status: 'FAIL', retry_count: { gte: 3 } },
  };
  return map[displayStatus] ?? undefined;
}

/**
 * DB 데이터(상태값, 재시도 횟수)를 UI에 보여줄 한글 명칭으로 변환
 * @param status DB의 status 컬럼 값 (SUCCESS, FAIL 등)
 * @param retryCount DB의 retry_count 컬럼 값
 */
function toDisplayStatus(status: string, retryCount: number): string {
  if (status === 'SUCCESS') return '성공';
  if (status === 'PERMANENT_FAIL') return '최종 실패';
  if (retryCount < 3) return '재처리 대기 중';
  return '실패';
}

@Injectable()
export class ApiLogsService {
  private readonly logger = new Logger(ApiLogsService.name);
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    searchDto: CreateApiLogDto,
    page: number = 1,
    limit: number = 50,
  ) {
    const {
      status,
      display_status,
      target_system,
      api_config_id,
      login_id,
      correlation_id,
    } = searchDto;

    const skip = (page - 1) * limit;

    // 공통 검색 조건 정의 (count와 findMany에서 재사용)
    const where: Prisma.api_logsWhereInput = {
      ...(display_status
        ? displayStatusToWhereFilter(display_status)
        : status
          ? { status }
          : undefined),
      correlation_id: correlation_id,
      api_config_id: api_config_id || undefined,
      api_configs: target_system
        ? {
            target_system: {
              contains: target_system,
              mode: 'insensitive' as Prisma.QueryMode,
            },
          }
        : undefined,
      users: login_id
        ? {
            login_id: {
              contains: login_id,
              mode: 'insensitive' as Prisma.QueryMode,
            },
          }
        : undefined,
    };

    // 1. 조건에 맞는 전체 개수 구하기
    const total = await this.prisma.api_logs.count({ where });

    // 2. 실제 데이터 조회
    const logs = await this.prisma.api_logs.findMany({
      where,
      orderBy: { requested_at: 'desc' },
      include: {
        api_configs: { select: { target_system: true, url: true } },
        users: { select: { login_id: true } },
      },
      skip,
      take: limit,
    });

    // 3. 데이터 가공 및 결과 반환
    const items = logs.map((log) => ({
      ...log,
      display_status: toDisplayStatus(log.status, log.retry_count),
    }));

    return {
      data: items,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    return await this.prisma.api_logs.findUnique({
      where: { id },
      include: { api_configs: true },
    });
  }
}
