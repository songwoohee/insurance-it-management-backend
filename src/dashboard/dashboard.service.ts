import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import {
  startOfHour,
  subHours,
  format,
  startOfDay,
  eachHourOfInterval,
} from 'date-fns';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /* 메인 함수: 오늘 총 호출 수, 성공 / 실패 수 집계 */
  async getStats() {
    const todayStart = startOfDay(new Date());

    const [today, total] = await Promise.all([
      this.getStatsByRange(todayStart), // 오늘 0시부터 현재까지
      this.getStatsByRange(), // 전체 기간
    ]);

    return { today, total };
  }

  /* 헬퍼 함수 
  1. 최근 성공, 실패 건수
  */
  private async getStatsByRange(startDate?: Date) {
    const whereClause = startDate ? { requested_at: { gte: startDate } } : {};

    // 1. 모든 로그를 가져오는 대신, 트랜잭션별로 그룹화된 '최신' 상태가 필요
    // 원천적으로 '최종 상태'를 판별할 수 있는 쿼리를 구성
    // [전체 트랜잭션 수] (correlation_id 기준 중복 제거)
    const totalTransactions = await this.prisma.api_logs.groupBy({
      by: ['correlation_id'],
      where: whereClause,
    });

    // [최종 성공 건수]
    // 특정 트랜잭션 내에 SUCCESS가 하나라도 있으면 그 건은 최종 성공
    const successTransactions = await this.prisma.api_logs.groupBy({
      by: ['correlation_id'],
      where: {
        ...whereClause,
        status: 'SUCCESS',
      },
    });

    // [최종 실패 건수]
    // 3회차까지 다 실패했거나(status: FAIL, retry_count: 3)
    // 혹은 아예 영구 실패(PERMANENT_FAIL)인 건들
    const finalFailTransactions = await this.prisma.api_logs.groupBy({
      by: ['correlation_id'],
      where: {
        ...whereClause,
        OR: [
          { status: 'PERMANENT_FAIL' },
          { status: 'FAIL', retry_count: { gte: 3 } },
        ],
      },
    });

    const totalCount = totalTransactions.length;
    const successCount = successTransactions.length;
    const failCount = finalFailTransactions.length;

    return {
      totalCount, // "시도 횟수"가 아닌 "발생한 사건(트랜잭션) 수"
      successCount, // "최종 성공"
      failCount, // "더 이상 가망 없는 실패"
      successRate:
        totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0,
      // 응답 시간은 '성공'한 로그들의 평균으로 잡는 것이 가장 합리적입니다.
      averageResponseTime: await this.getAverageResponseTime(whereClause),
    };
  }

  /* 2. 평균 응답 시간 (성공한 로그들의 데이터 사용) */
  private async getAverageResponseTime(whereClause: any) {
    const avgRes = await this.prisma.api_logs.aggregate({
      where: { ...whereClause, status: 'SUCCESS' },
      _avg: { execution_time_ms: true },
    });
    return Math.round(avgRes._avg.execution_time_ms || 0);
  }

  /* 기관별 상태 호출 */
  async getSystemStatus() {
    // 1. 모든 활성화된 인터페이스 설정을 가져오면서, 각 설정의 최신 로그 1건을 포함(Join)
    const configs = await this.prisma.api_configs.findMany({
      where: { is_active: true },
      select: {
        id: true,
        target_system: true,
        name: true,
        api_logs: {
          orderBy: { requested_at: 'desc' },
          take: 1, // 가장 최근 로그 딱 하나만 가져옴
        },
      },
    });

    // 2. 가져온 데이터를 순회하며 상태 판별 로직 적용
    return configs.map((config) => {
      const lastLog = config.api_logs[0]; // 최신 로그 1건

      let status = 'HEALTHY'; // 기본: 초록 (HEALTHY)

      if (!lastLog) {
        status = 'UNKNOWN'; // 로그가 아예 없는 경우
      } else if (lastLog.status.startsWith('FAIL')) {
        status = 'ERROR'; // 실패(FAIL, PERMANENT_FAIL)면 빨강 (ERROR)
      } else if ((lastLog.execution_time_ms || 0) >= 1500) {
        status = 'DELAY'; // 응답시간 1.5초 이상이면 노랑 (DELAY)
      }

      return {
        configId: config.id,
        targetSystem: config.target_system, // 예: 삼성생명, Toss
        interfaceName: config.name, // 예: 보험금 청구 API
        status: status, // 프론트에서 색상 결정할 키값
        lastExecutionTime: lastLog?.execution_time_ms || 0,
        lastRequestedAt: lastLog?.requested_at || null,
      };
    });
  }

  /* ----- 차트 데이터 ----- */
  /** 24시간 현황 (Rolling 24 Hours) */
  async getChartData() {
    const now = new Date();
    const startTime = subHours(now, 23); // 현재부터 23시간 전까지 (총 24개 포인트)

    return this.generateChartData(startTime, now);
  }

  /** 오늘의 트래픽 (Today 00:00 ~ Now) */
  async getTodayChartData() {
    const now = new Date();
    const startTime = startOfDay(now); // 오늘 00:00:00

    return this.generateChartData(startTime, now);
  }

  /** 공통 차트 데이터 생성 로직 */
  private async generateChartData(startTime: Date, endTime: Date) {
    const logs = await this.prisma.api_logs.findMany({
      where: {
        requested_at: { gte: startTime, lte: endTime },
      },
      select: { requested_at: true, status: true },
    });

    const chartDataMap = new Map();

    // 시작 시간부터 종료 시간까지 1시간 단위로 레이블 생성
    const timeInterval = eachHourOfInterval({ start: startTime, end: endTime });

    timeInterval.forEach((time) => {
      const label = format(time, 'HH:mm');
      chartDataMap.set(label, { time: label, total: 0, success: 0, fail: 0 });
    });

    logs.forEach((log) => {
      const label = format(startOfHour(log.requested_at), 'HH:mm');
      if (chartDataMap.has(label)) {
        const item = chartDataMap.get(label);
        item.total += 1;
        if (log.status === 'SUCCESS') item.success += 1;
        else if (log.status.includes('FAIL')) item.fail += 1;
      }
    });

    return Array.from(chartDataMap.values());
  }

  // 실시간 이슈 타임라인 API (최근 실패 로그 10건)
  async getRecentFailures() {
    const failures = await this.prisma.api_logs.findMany({
      where: {
        status: {
          contains: 'FAIL', // FAIL, FAIL_INTERNAL 등 모든 에러 포함
        },
      },
      take: 10, // 최근 10건만
      orderBy: {
        requested_at: 'desc',
      },
      include: {
        api_configs: {
          // DB 테이블명에 맞춰 확인 필요 (api_config 또는 api_configs)
          select: {
            name: true,
            target_system: true,
          },
        },
      },
    });

    // 프론트에서 쓰기 편하게 데이터 가공
    return failures.map((log) => ({
      id: log.id,
      interfaceName: log.api_configs?.name || '알 수 없는 인터페이스',
      targetSystem: log.api_configs?.target_system || 'UNKNOWN',
      status: log.status,
      message: log.error_msg, // 에러 원인 메시지
      requestedAt: log.requested_at,
      responseTime: log.execution_time_ms,
    }));
  }
}
