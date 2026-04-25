import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    // 1. 유저 검증 및 토큰 발급
    const result = await this.authService.login(
      loginDto.loginId,
      loginDto.password,
    );

    if (!result) {
      throw new UnauthorizedException('아이디 또는 비밀번호가 잘못되었습니다.');
    }

    return result;
  }
}
