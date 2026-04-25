import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { ApiConfigsModule } from './api-configs/api-configs.module';
import { ApiLogsModule } from './api-logs/api-logs.module';
import { ExternalModule } from './external/external.module';
import { ScheduleModule } from '@nestjs/schedule';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 전역에서 환경 변수를 쓸 수 있게 설정
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    ApiConfigsModule,
    ApiLogsModule,
    ExternalModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
