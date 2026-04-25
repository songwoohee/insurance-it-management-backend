import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  BadRequestException,
  ServiceUnavailableException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ExternalService } from './external.service';

// ─── 유틸 ──────────────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function randomFail(rate: number, message: string) {
  if (Math.random() < rate) {
    return { res_code: '9999', res_msg: message };
  }
  return null;
}

@Controller('external')
export class ExternalController {
  constructor(private readonly externalService: ExternalService) {}

  // ══════════════════════════════════════════════════════
  // 삼성생명 (SAMSUNG-LIFE)
  // ══════════════════════════════════════════════════════

  /** 계약 정보 조회 */
  @Get('samsung-life/contract')
  getSamsungContract(@Query('customer_id') customerId: string) {
    return {
      res_code: '0000',
      res_msg: '조회 성공',
      company: '삼성생명',
      customer_id: customerId ?? 'CUST_UNKNOWN',
      contracts: [
        {
          policy_no: 'SL-001122',
          product: '삼성생명 종신보험',
          premium: 120000,
          status: 'ACTIVE',
        },
        {
          policy_no: 'SL-003344',
          product: '삼성 어린이보험',
          premium: 85000,
          status: 'ACTIVE',
        },
      ],
    };
  }

  /** 보험료 납입 처리 */
  @Post('samsung-life/payment')
  postSamsungPayment(@Body() body: any) {
    return {
      res_code: '0000',
      res_msg: '납입 처리 완료',
      policy_no: body.policy_no ?? 'SL-001122',
      amount: body.amount ?? 120000,
      paid_at: new Date().toISOString(),
      receipt_no: `SL-RCPT-${Date.now()}`,
    };
  }

  /** 해지환급금 조회 */
  @Get('samsung-life/surrender-value')
  getSamsungSurrenderValue(@Query('policy_no') policyNo: string) {
    return {
      res_code: '0000',
      res_msg: '조회 성공',
      policy_no: policyNo ?? 'SL-001122',
      surrender_value: 4320000,
      base_date: new Date().toISOString().split('T')[0],
    };
  }

  /** 수익자 변경 */
  @Post('samsung-life/beneficiary')
  postSamsungBeneficiary(@Body() body: any) {
    const fail = randomFail(0.2, '삼성생명 시스템 일시 장애');
    if (fail) return fail;
    return {
      res_code: '0000',
      res_msg: '수익자 변경 완료',
      policy_no: body.policy_no,
      new_beneficiary: body.beneficiary_name,
      changed_at: new Date().toISOString(),
    };
  }

  /** 보험증권 재발급 */
  @Post('samsung-life/certificate')
  postSamsungCertificate(@Body() body: any) {
    return {
      res_code: '0000',
      res_msg: '증권 발급 요청 완료',
      policy_no: body.policy_no,
      issue_no: `SL-CERT-${Date.now()}`,
      estimated_delivery: '3영업일 이내',
    };
  }

  // ══════════════════════════════════════════════════════
  // 한화생명 (HANWHA-LIFE)
  // ══════════════════════════════════════════════════════

  /** 계약 조회 */
  @Get('hanwha-life/contract')
  getHanwhaContract(@Query('customer_id') customerId: string) {
    return {
      res_code: '00',
      res_msg: 'SUCCESS',
      company: '한화생명',
      customer_id: customerId ?? 'CUST_UNKNOWN',
      contracts: [
        {
          policy_no: 'HW-556677',
          product: '한화 생명사랑보험',
          premium: 95000,
          status: 'ACTIVE',
        },
        {
          policy_no: 'HW-889900',
          product: '한화 CI보험',
          premium: 210000,
          status: 'ACTIVE',
        },
      ],
    };
  }

  /** 보험금 청구 */
  @Post('hanwha-life/claim')
  postHanwhaClaim(@Body() body: any) {
    const fail = randomFail(0.15, '한화생명 청구 시스템 오류');
    if (fail) return fail;
    return {
      res_code: '00',
      res_msg: '청구 접수 완료',
      claim_no: `HW-CLM-${Date.now()}`,
      policy_no: body.policy_no,
      claimed_amount: body.amount ?? 0,
      status: 'PENDING',
      expected_date: '5영업일 이내',
    };
  }

  /** 납입 내역 조회 */
  @Get('hanwha-life/payment-history')
  getHanwhaPaymentHistory(@Query('policy_no') policyNo: string) {
    return {
      res_code: '00',
      res_msg: 'SUCCESS',
      policy_no: policyNo,
      history: [
        { paid_at: '2026-03-25', amount: 95000, method: '자동이체' },
        { paid_at: '2026-02-25', amount: 95000, method: '자동이체' },
        { paid_at: '2026-01-25', amount: 95000, method: '자동이체' },
      ],
    };
  }

  /** 약관대출 조회 */
  @Get('hanwha-life/loan')
  getHanwhaLoan(@Query('policy_no') policyNo: string) {
    return {
      res_code: '00',
      res_msg: 'SUCCESS',
      policy_no: policyNo,
      loan_limit: 3200000,
      loan_balance: 0,
      interest_rate: 3.5,
    };
  }

  /** 갱신 안내 발송 */
  @Post('hanwha-life/renewal-notice')
  postHanwhaRenewal(@Body() body: any) {
    return {
      res_code: '00',
      res_msg: '갱신 안내 발송 완료',
      policy_no: body.policy_no,
      sent_to: body.contact ?? 'SMS',
      sent_at: new Date().toISOString(),
    };
  }

  // ══════════════════════════════════════════════════════
  // 현대해상 (HYUNDAI-MARINE)
  // ══════════════════════════════════════════════════════

  /** 자동차보험 계약 조회 */
  @Get('hyundai-marine/auto-insurance')
  getHyundaiAuto(@Query('car_no') carNo: string) {
    return {
      result_code: '0000',
      result_msg: '정상',
      car_no: carNo ?? '00가0000',
      policy: {
        policy_no: 'HM-AUTO-112233',
        product: '현대해상 하이카 자동차보험',
        coverage: '대인/대물/자손/자차',
        expire_date: '2027-03-01',
        premium: 680000,
      },
    };
  }

  /** 사고 접수 */
  @Post('hyundai-marine/accident')
  postHyundaiAccident(@Body() body: any) {
    return {
      result_code: '0000',
      result_msg: '사고 접수 완료',
      accident_no: `HM-ACC-${Date.now()}`,
      reported_at: new Date().toISOString(),
      assigned_adjuster: '김민준 손해사정사',
      contact: '1588-5656',
    };
  }

  /** 보상 처리 현황 */
  @Get('hyundai-marine/compensation')
  getHyundaiCompensation(@Query('accident_no') accidentNo: string) {
    return {
      result_code: '0000',
      result_msg: '정상',
      accident_no: accidentNo,
      status: '심사중',
      estimated_amount: 1500000,
      updated_at: new Date().toISOString(),
    };
  }

  /** 보험료 계산 */
  @Post('hyundai-marine/premium-calc')
  postHyundaiPremiumCalc(@Body() body: any) {
    const base = 500000;
    const age_factor = body.age ? (body.age < 26 ? 1.3 : 1.0) : 1.0;
    return {
      result_code: '0000',
      result_msg: '계산 완료',
      estimated_premium: Math.round(base * age_factor),
      valid_until: new Date(Date.now() + 86400000 * 7).toISOString(),
    };
  }

  /** 계약 갱신 */
  @Post('hyundai-marine/renewal')
  async postHyundaiRenewal(@Body() body: any) {
    await delay(800);
    const fail = randomFail(0.1, '현대해상 갱신 처리 서버 오류');
    if (fail) return fail;
    return {
      result_code: '0000',
      result_msg: '갱신 완료',
      policy_no: body.policy_no,
      new_expire_date: '2027-04-01',
      renewed_at: new Date().toISOString(),
    };
  }

  /** [지연] 현대해상 장기보험 계약 변경 (1.8초 지연) */
  @Post('hyundai-marine/contract-change')
  async postHyundaiChange(@Body() body: any) {
    await delay(1800); // 1.5초를 넘겨서 노란색 유도
    return {
      result_code: '0000',
      result_msg: '변경 요청 완료 (처리 지연)',
      policy_no: body.policy_no,
    };
  }

  // ══════════════════════════════════════════════════════
  // KB손해보험 (KB-INSURANCE)
  // ══════════════════════════════════════════════════════

  /** 계약 조회 */
  @Get('kb-insurance/contract')
  getKbContract(@Query('customer_id') customerId: string) {
    return {
      code: '200',
      message: 'OK',
      company: 'KB손해보험',
      customer_id: customerId,
      contracts: [
        {
          policy_no: 'KB-334455',
          product: 'KB 다이렉트 자동차보험',
          premium: 520000,
        },
        {
          policy_no: 'KB-667788',
          product: 'KB 건강보험 플러스',
          premium: 73000,
        },
      ],
    };
  }

  /** 사고 접수 */
  @Post('kb-insurance/accident')
  postKbAccident(@Body() body: any) {
    return {
      code: '200',
      message: '사고 접수 완료',
      accident_no: `KB-ACC-${Date.now()}`,
      policy_no: body.policy_no,
      reported_at: new Date().toISOString(),
    };
  }

  /** 보상금 지급 처리 */
  @Post('kb-insurance/payout')
  async postKbPayout(@Body() body: any) {
    await delay(1000);
    const fail = randomFail(0.2, 'KB 지급 시스템 일시 장애');
    if (fail) return fail;
    return {
      code: '200',
      message: '지급 처리 완료',
      accident_no: body.accident_no,
      payout_amount: body.amount ?? 0,
      paid_at: new Date().toISOString(),
      bank_account: '마스킹 처리됨',
    };
  }

  /** 보험료 납입 */
  @Post('kb-insurance/payment')
  postKbPayment(@Body() body: any) {
    return {
      code: '200',
      message: '납입 완료',
      policy_no: body.policy_no,
      amount: body.amount,
      paid_at: new Date().toISOString(),
      receipt_no: `KB-RCPT-${Date.now()}`,
    };
  }

  /** 증권 재발급 */
  @Post('kb-insurance/certificate')
  postKbCertificate(@Body() body: any) {
    return {
      code: '200',
      message: '재발급 완료',
      policy_no: body.policy_no,
      issue_no: `KB-CERT-${Date.now()}`,
      method: body.method ?? 'EMAIL',
    };
  }

  /** [지연] KB손보 대량 납입 내역 조회 (2.2초 지연) */
  @Get('kb-insurance/huge-history')
  async getKbHugeHistory(@Query('policy_no') policyNo: string) {
    await delay(2200); // 대량 데이터 조회 시뮬레이션
    return {
      code: '200',
      message: '조회 완료',
      data_count: 5000,
    };
  }

  // ══════════════════════════════════════════════════════
  // 카카오페이 (KAKAOPAY)
  // ══════════════════════════════════════════════════════

  /** 결제 승인 */
  @Post('kakaopay/approve')
  postKakaoApprove(@Body() body: any) {
    return {
      tid: `T${Date.now()}`,
      status: 'SUCCESS',
      partner_order_id: body.partner_order_id ?? `ORD-${Date.now()}`,
      item_name: body.item_name ?? '보험료 납입',
      amount: body.amount ?? 0,
      approved_at: new Date().toISOString(),
    };
  }

  /** 결제 취소 */
  @Post('kakaopay/cancel')
  postKakaoCancel(@Body() body: any) {
    const fail = randomFail(0.1, '카카오페이 취소 처리 오류');
    if (fail) return fail;
    return {
      tid: body.tid,
      status: 'CANCEL_PAYMENT',
      canceled_amount: body.cancel_amount ?? 0,
      canceled_at: new Date().toISOString(),
    };
  }

  /** 납입 내역 조회 */
  @Get('kakaopay/payment-history')
  getKakaoPaymentHistory(@Query('user_id') userId: string) {
    return {
      user_id: userId,
      payments: [
        {
          tid: 'T001',
          item_name: '삼성생명 보험료',
          amount: 120000,
          paid_at: '2026-03-25T09:00:00Z',
        },
        {
          tid: 'T002',
          item_name: '현대해상 보험료',
          amount: 68000,
          paid_at: '2026-02-25T09:00:00Z',
        },
      ],
    };
  }

  /** 자동납입 등록 */
  @Post('kakaopay/auto-payment')
  postKakaoAutoPayment(@Body() body: any) {
    return {
      status: 'SUCCESS',
      sid: `S${Date.now()}`,
      partner_user_id: body.partner_user_id,
      item_name: body.item_name ?? '자동납입',
      registered_at: new Date().toISOString(),
    };
  }

  /** 잔액 조회 */
  @Get('kakaopay/balance')
  getKakaoBalance(@Query('user_id') userId: string) {
    return {
      user_id: userId,
      balance: 152000,
      point: 3200,
      checked_at: new Date().toISOString(),
    };
  }

  /** [오류] 카카오페이 잔액 점검 (80% 확률로 점검 중) */
  @Get('kakaopay/maintenance')
  getKakaoMaintenance() {
    if (Math.random() < 0.8) {
      throw new ServiceUnavailableException({
        // 503 에러 유도
        tid: null,
        status: 'SYSTEM_MAINTENANCE',
        message: '카카오페이 시스템 정기 점검 중입니다 (02:00~06:00)',
      });
    }
    return { status: 'SUCCESS', message: '정상' };
  }

  // ══════════════════════════════════════════════════════
  // 토스 (TOSS)
  // ══════════════════════════════════════════════════════

  /** 계좌 실명 인증 */
  @Post('toss/account-verify')
  postTossAccountVerify(@Body() body: any) {
    return {
      success: true,
      bank_code: body.bank_code ?? '088',
      account_no: body.account_no,
      holder_name: '홍길동',
      verified_at: new Date().toISOString(),
    };
  }

  /** 결제 요청 */
  @Post('toss/payment')
  postTossPayment(@Body() body: any) {
    const fail = randomFail(0.15, '토스 결제 서버 오류');
    if (fail) return fail;
    return {
      success: true,
      payment_key: `TOSS-PAY-${Date.now()}`,
      order_id: body.order_id ?? `ORD-${Date.now()}`,
      amount: body.amount ?? 0,
      method: body.method ?? '카드',
      approved_at: new Date().toISOString(),
    };
  }

  /** [오류] 토스 결제 취소 (무조건 실패) */
  @Post('toss/refund-error')
  async postTossRefundFail(@Body() body: any) {
    await delay(300);
    throw new BadRequestException({
      success: false,
      error_code: 'REFUND_NOT_ALLOWED',
      message: '이미 취소된 거래이거나 취소 가능 금액이 없습니다.',
    });
  }

  /** 결제 결과 조회 */
  @Get('toss/payment-result')
  getTossPaymentResult(@Query('payment_key') paymentKey: string) {
    return {
      success: true,
      payment_key: paymentKey,
      status: 'DONE',
      amount: 95000,
      method: '카드',
      approved_at: new Date().toISOString(),
    };
  }

  /** 자동이체 등록 */
  @Post('toss/auto-transfer')
  async postTossAutoTransfer(@Body() body: any) {
    await delay(600);
    return {
      success: true,
      billing_key: `TOSS-BILL-${Date.now()}`,
      customer_key: body.customer_key,
      card_company: body.card_company ?? 'KB국민카드',
      registered_at: new Date().toISOString(),
    };
  }

  /** 환불 처리 */
  @Post('toss/refund')
  async postTossRefund(@Body() body: any) {
    await delay(500);
    const fail = randomFail(0.2, '토스 환불 처리 실패');
    if (fail) return fail;
    return {
      success: true,
      payment_key: body.payment_key,
      refund_amount: body.amount ?? 0,
      refunded_at: new Date().toISOString(),
    };
  }

  /* 에러 모음 */
  // external.controller.ts

  /* --- DB다이렉트 시뮬레이션 --- */

  // 1. 401 Unauthorized (인증 오류 - API Key 만료)
  @Post('db-direct/auth-error')
  dbAuthError() {
    throw new HttpException('Invalid Partner Token', HttpStatus.UNAUTHORIZED);
  }

  // 2. 403 Forbidden (권한 오류 - 허용되지 않은 IP)
  @Post('db-direct/forbidden')
  dbForbidden() {
    throw new HttpException(
      'Access Denied: IP White-list mismatch',
      HttpStatus.FORBIDDEN,
    );
  }

  // 3. 500 Internal Server Error (서버 장애 - DB 연결 오류)
  @Post('db-direct/server-error')
  dbServerError() {
    throw new HttpException(
      'Database Connection Failed',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  // 4. 503 Service Unavailable (점검 중 - 시스템 배치 작업)
  @Post('db-direct/maintenance')
  dbMaintenance() {
    throw new HttpException(
      'System Maintenance: Batch Processing',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  // 5. Timeout (응답 지연 - 보험료 계산 로직 부하)
  @Post('db-direct/timeout')
  async dbTimeout() {
    // 4초 대기 (확실한 노란색/지연 상태 유도)
    await new Promise((resolve) => setTimeout(resolve, 4000));
    return { status: 'SUCCESS', message: 'Calculation Completed' };
  }
}
