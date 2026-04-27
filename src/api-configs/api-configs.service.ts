import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateApiConfigDto } from './dto/create-api-config.dto';
import { UpdateApiConfigDto } from './dto/update-api-config.dto';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma.service';
import { lastValueFrom } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';

@Injectable()
export class ApiConfigsService {
  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
  ) {}

  /**
   * [인터페이스 실행 및 로그 저장 서비스]
   * 특정 API 설정을 읽어와 외부 서버(External)와 통신하고, 그 결과를 DB에 기록합
   */
  async runInterface(
    id: string,
    userId: string,
    retryCount = 0,
    correlationId?: string,
  ): Promise<unknown> {
    // 1. DB에서 해당 API의 설정 정보(URL, Method 등)를 조회
    const config = await this.prisma.api_configs.findUnique({
      where: { id },
    });
    // 2. 설정 정보가 없으면 에러 반환
    if (!config) throw new NotFoundException('설정 정보를 찾을 수 없습니다.');

    // 최초 요청이면 새로운 트랜잭션 UUID 생성, 재처리면 기존 ID 유지
    const currentCorrelationId = correlationId || crypto.randomUUID();

    const requestPayload = config.request_payload ?? {
      message: '정의된 요청 규격이 없습니다.',
    };

    // 3. 실행 상태 및 시간 측정을 위한 초기 변수 세팅
    const startTime = Date.now();
    let status = 'SUCCESS';
    let statusCode = '200';
    let responsePayload: unknown = {};
    let errorMsg: string | null = null;

    try {
      // 4. [실행] HttpService를 통해 외부 API(External Controller) 호출
      const response: AxiosResponse<unknown> = await lastValueFrom(
        this.httpService.request({
          url: config.url,
          method: String(config.method ?? 'GET'),
          timeout: 5000, // 5초 초과 시 타임아웃
          data: config.method === 'POST' ? requestPayload : undefined,
        }),
      );

      // 5. [성공] 응답 데이터와 상태 코드를 변수에 저장
      responsePayload = response.data;
      statusCode = response.status.toString();
    } catch (error) {
      // 6. [에러] 통신 실패 시 상태를 'FAIL'로 바꾸고 에러 내용 수집
      const axiosError = error as AxiosError<unknown>;
      status = 'FAIL';
      statusCode = axiosError.response?.status?.toString() || '500';
      responsePayload = axiosError.response?.data || {
        message: axiosError.message,
      };
      errorMsg = axiosError.message;
    }

    // 7. 종료 시간 기록 및 소요 시간(ms) 계산
    const endTime = Date.now();
    const executionTime = endTime - startTime;

    // 8. [기록] api_logs 테이블에 최종 실행 결과(성공/실패 모두)를 INSERT
    const result = await this.prisma.api_logs.create({
      data: {
        api_configs: {
          connect: { id: id },
        },
        users: {
          connect: { id: userId },
        },
        status: status,
        status_code: statusCode,
        request_payload: requestPayload,
        response_payload: responsePayload as any,
        error_msg: errorMsg,
        retry_count: retryCount,
        execution_time_ms: executionTime,
        requested_at: new Date(startTime),
        responded_at: new Date(endTime),
        correlation_id: currentCorrelationId,
      },
    });

    // 9. 로그 데이터 최종 반환
    return result;
  }

  /**
   * [인터페이스 재처리 서비스]
   * 실패한 로그 ID를 받아 해당 설정을 다시 실행
   */
  async retryInterface(logId: string, userId: string) {
    // 1. 실패한 로그 기록을 먼저 조회
    const failedLog = await this.prisma.api_logs.findUnique({
      where: { id: logId },
      include: { api_configs: true }, // 연결된 설정 정보까지 같이 가져옴
    });

    if (!failedLog)
      throw new NotFoundException('로그 기록을 찾을 수 없습니다.');

    // 2. 이미 성공한 로그라면 재처리할 필요가 없음 (선택 사항)
    if (failedLog.status === 'SUCCESS') {
      return { message: '이미 성공한 요청입니다.', data: failedLog };
    }

    // 3. 기존 로그의 retry_count를 +1 해서 다시 실행 (runInterface 재활용!)
    // 세 번째 인자로 기존 시도 횟수 + 1을 넘겨줌
    return await this.runInterface(
      failedLog.api_config_id,
      userId,
      failedLog.retry_count + 1,
      failedLog.correlation_id ?? undefined,
    );
  }

  /**
   * [인터페이스 설정 등록]
   * 새로운 외부 API 연동 설정을 저장
   */
  async create(createApiConfigDto: CreateApiConfigDto, userId: string) {
    return await this.prisma.api_configs.create({
      data: {
        ...createApiConfigDto,
        users_api_configs_created_byTousers: {
          connect: { id: userId },
        },
      },
    });
  }

  /* 파일 관련 함수 판별 보조 함수 */
  private identifyActionType(url: string, method: string) {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('upload')) return 'UPLOAD';
    if (lowerUrl.includes('bulk-download') || lowerUrl.includes('download'))
      return 'DOWNLOAD';
    if (
      lowerUrl.includes('list') ||
      (lowerUrl.includes('files') && method === 'GET')
    )
      return 'LIST';
    return 'UNKNOWN';
  }

  /**
   * [목록 조회 - 페이지네이션 적용]
   * @param page 조회할 페이지 번호
   * @param limit 한 페이지에 보여줄 개수
   */
  async findAll(page: number = 1, limit: number = 50) {
    // 1. 건너뛸 개수 계산 (예: 2페이지고 50개씩이면 앞의 50개를 skip)
    const skip = (page - 1) * limit;

    // 2. 전체 데이터 개수 조회 (프론트 페이지네이션 계산용)
    const total = await this.prisma.api_configs.count();

    // 3. 조건에 맞는 데이터만 조회
    const data = await this.prisma.api_configs.findMany({
      skip: skip,
      take: limit,
      orderBy: {
        created_at: 'desc',
      },
      include: {
        users_api_configs_updated_byTousers: {
          select: { login_id: true },
        },
      },
    });

    const mappedData = data.map((config) => ({
      ...config,
      // 아까 만든 판별 함수를 여기서 호출해서 action_type 필드를 추가해줍니다.
      action_type: this.identifyActionType(
        config.url ?? '',
        config.method ?? '',
      ),
    }));

    // 4. 데이터와 전체 개수를 함께 반환
    return {
      data: mappedData,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * [상세 정보 조회]
   * 특정 ID의 상세 정보 가져오기
   */
  async findOne(id: string) {
    const config = await this.prisma.api_configs.findUnique({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException('요청하신 정보가 존재하지 않습니다.');
    }
    return config;
  }

  /** [수정] 특정 ID의 설정 변경 */
  async update(
    id: string,
    updateApiConfigDto: UpdateApiConfigDto,
    userId: string,
  ) {
    return await this.prisma.api_configs.update({
      where: { id },
      data: {
        ...updateApiConfigDto,
        updated_by: userId,
        updated_at: new Date(),
      },
    });
  }

  /** [삭제] 특정 ID의 설정 제거 */
  async remove(id: string) {
    return await this.prisma.api_configs.delete({
      where: { id },
    });
  }
}
