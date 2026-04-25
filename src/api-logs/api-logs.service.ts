import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateApiLogDto } from './dto/create-api-log.dto';

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

  async findAll(searchDto: CreateApiLogDto) {
    const {
      status,
      display_status,
      target_system,
      api_config_id,
      login_id,
      correlation_id,
    } = searchDto;

    const statusFilter = display_status
      ? displayStatusToWhereFilter(display_status)
      : status
        ? { status }
        : undefined;

    const logs = await this.prisma.api_logs.findMany({
      where: {
        // 값 있을 때만 조건 적용, undefined면 Prisma가 조건 무시함
        ...statusFilter,
        correlation_id: correlation_id,
        api_config_id: api_config_id || undefined,

        // target_system은 api_configs 관계 테이블 필드
        api_configs: target_system
          ? {
              target_system: {
                contains: target_system, // 부분 검색
                mode: 'insensitive', // 대소문자 무시
              },
            }
          : undefined,

        // login_id로 users 테이블까지 타고 들어가기
        users: login_id
          ? {
              login_id: {
                contains: login_id,
                mode: 'insensitive',
              },
            }
          : undefined,
      },
      orderBy: {
        requested_at: 'desc',
      },
      include: {
        api_configs: {
          select: {
            target_system: true, // 보험사/시스템 명 (삼성생명, 토스 등)
            url: true, // 호출했던 엔드포인트 URL
          },
        },
        users: {
          select: { login_id: true },
        },
      },
      take: 50,
    });

    return logs.map((log) => ({
      ...log,
      display_status: toDisplayStatus(log.status, log.retry_count),
    }));
  }

  async findOne(id: string) {
    return await this.prisma.api_logs.findUnique({
      where: { id },
      include: { api_configs: true },
    });
  }
}
