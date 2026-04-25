import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginId: string, pass: string) {
    // 1. DB에서 유저 바로 찾기
    const user = await this.prisma.users.findUnique({
      where: { login_id: loginId },
    });

    // 2. 패스워드 체크
    if (user && (await bcrypt.compare(pass, user.password))) {
      // 3. 통과하면 바로 토큰 전달
      const payload = { sub: user.id, loginId: user.login_id };
      return {
        access_token: this.jwtService.sign(payload),
      };
    }

    throw new UnauthorizedException('인증되지 않은 사용자입니다.');
  }
}
