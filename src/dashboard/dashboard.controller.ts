import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /* 통계: 성공, 실패 집계, 총 호출 수 */
  @Get('stats')
  getStats() {
    return this.dashboardService.getStats();
  }

  /* 기관별 상태 호출 */
  @Get('status')
  async getSystemStatus() {
    return await this.dashboardService.getSystemStatus();
  }

  /** 최근 24시간 흐름 (Rolling) */
  @Get('chart/24h')
  async getRollingChart() {
    return await this.dashboardService.getChartData();
  }

  /** 오늘 0시부터 현재까지 (Today) */
  @Get('chart/today')
  async getTodayChart() {
    return await this.dashboardService.getTodayChartData();
  }

  /* 실시간 이슈 */
  @Get('recent-failures')
  async getRecentFailures() {
    return await this.dashboardService.getRecentFailures();
  }
}
