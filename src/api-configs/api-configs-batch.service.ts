import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ApiConfigsService } from './api-configs.service';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class ApiConfigsBatchService {
  private readonly logger = new Logger(ApiConfigsBatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly apiConfigsService: ApiConfigsService,
  ) {}

  // 1분마다 실행 (테스트를 위해 매 분 실행으로 설정)
  @Cron(CronExpression.EVERY_MINUTE)
  async handleRetryBatch() {
    this.logger.debug('대기 중인 재처리 작업을 확인합니다...');

    // 1. 재처리가 필요한 로그 조회
    // 조건: 상태가 FAIL이고, 재시도 횟수가 3회 미만인 로그들
    const targetLogs = await this.prisma.api_logs.findMany({
      where: {
        status: 'FAIL',
        retry_count: { lt: 3 }, // lt는 'Less Than' (< 3)
        is_processed: false,
      },
      take: 10, // 한 번에 너무 많이 하면 서버에 무리가 가니 10개씩 끊어서 처리
    });

    if (targetLogs.length === 0) {
      return;
    }

    this.logger.log(
      `${targetLogs.length}건의 실패 로그를 발견했습니다. 재처리를 시작합니다.`,
    );

    // 2. 루프를 돌며 재처리 로직(retryInterface) 호출
    for (const log of targetLogs) {
      try {
        // 잡자마자 바로 true로 업데이트 (중복 방지)
        await this.prisma.api_logs.update({
          where: { id: log.id },
          data: { is_processed: true },
        });

        this.logger.log(
          `[Batch] Log ID: ${log.id} 재시도 시작 (현재 횟수: ${log.retry_count})`,
        );

        // 시스템이 자동으로 하는 것이므로 userId는 시스템 관리자 ID나 특정 ID를 사용
        await this.apiConfigsService.retryInterface(log.id, log.user_id);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : '알 수 없는 오류';

        // 현재 로그의 시도 횟수를 확인 (0부터 시작하므로 +1)
        const currentRetryCount = log.retry_count + 1;

        // 3회차(최종) 재시도마저 실패했다면?
        if (currentRetryCount >= 3) {
          this.logger.error(
            `[Batch] Log ID: ${log.id} 최종 실패 처리 (3회 초과)`,
          );

          // DB의 해당 로그(혹은 원본 로그)의 상태를 '최종 실패'로 업데이트
          // 프론트엔드는 이 error_msg를 전달
          await this.prisma.api_logs.update({
            where: { id: log.id },
            data: {
              status: 'PERMANENT_FAIL', // 'FAIL'과 구분되는 최종 실패 상태값
              error_msg: `해당 기관 시스템 응답이 원활하지 않아 재시도하였으나 실패했습니다. 잠시 후 직접 다시 시도해 주세요.`,
            },
          });
        } else {
          // 아직 재시도 기회가 남은 경우의 로그
          this.logger.warn(
            `[Batch] Log ID: ${log.id} 재처리 중 오류 발생 (횟수: ${currentRetryCount}): ${errorMessage}`,
          );
        }
      }
    }
  }
}
