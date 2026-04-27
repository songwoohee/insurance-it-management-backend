import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ApiConfigsService } from './api-configs.service';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class ApiConfigsBatchService {
  private readonly logger = new Logger(ApiConfigsBatchService.name);
  private isProcessing = false; // 중복 실행 방지 플래그

  constructor(
    private readonly prisma: PrismaService,
    private readonly apiConfigsService: ApiConfigsService,
  ) {}

  // 5분마다 실행 (DB 부하 방지를 위해 주기 조정)
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleRetryBatch() {
    // 1. 이미 실행 중이면 중복 실행 방지
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      this.logger.debug('대기 중인 재처리 작업을 확인합니다...');

      // 2. 재처리가 필요한 로그 조회 (5개씩 끊어서 처리)
      const targetLogs = await this.prisma.api_logs.findMany({
        where: {
          status: 'FAIL',
          retry_count: { lt: 3 },
          is_processed: false,
        },
        take: 5,
      });

      if (targetLogs.length === 0) {
        return;
      }

      this.logger.log(
        `${targetLogs.length}건의 실패 로그를 발견했습니다. 재처리를 시작합니다.`,
      );

      // 3. 루프를 돌며 재처리 로직 수행
      for (const log of targetLogs) {
        try {
          // 즉시 처리 중 상태로 업데이트
          await this.prisma.api_logs.update({
            where: { id: log.id },
            data: { is_processed: true },
          });

          this.logger.log(
            `[Batch] Log ID: ${log.id} 재시도 시작 (현재 횟수: ${log.retry_count})`,
          );

          // 재처리 서비스 호출
          await this.apiConfigsService.retryInterface(log.id, log.user_id);

          // DB 커넥션 여유를 위해 0.5초 대기
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : '알 수 없는 오류';
          const currentRetryCount = log.retry_count + 1;

          if (currentRetryCount >= 3) {
            this.logger.error(
              `[Batch] Log ID: ${log.id} 최종 실패 처리 (3회 초과)`,
            );
            await this.prisma.api_logs.update({
              where: { id: log.id },
              data: {
                status: 'PERMANENT_FAIL',
                error_msg: `해당 기관 시스템 응답이 원활하지 않아 재시도하였으나 실패했습니다. 잠시 후 직접 다시 시도해 주세요.`,
              },
            });
          } else {
            this.logger.warn(
              `[Batch] Log ID: ${log.id} 재처리 중 오류 발생 (횟수: ${currentRetryCount}): ${errorMessage}`,
            );
          }
        }
      }
    } catch (globalError) {
      this.logger.error('배치 프로세스 중 예상치 못한 오류 발생:', globalError);
    } finally {
      // 4. 모든 처리가 끝난 후(for문 밖)에만 플래그를 false로 변경
      this.isProcessing = false;
    }
  }
}
