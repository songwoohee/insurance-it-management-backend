import { Module } from '@nestjs/common';
import { FtpService } from './ftp.service';
import { FtpController } from './ftp.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [FtpController],
  providers: [FtpService, PrismaService],
  exports: [FtpService],
})
export class FtpModule {}
