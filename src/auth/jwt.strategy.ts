import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

interface JwtPayload {
  sub: string;
  loginId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private configService: ConfigService) {
    super({
      // 1. 헤더에서 Bearer 토큰 추출
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // 2. 토큰 생성 시 썼던 비밀키 (환경변수에서 가져옴)
      secretOrKey: configService.get<string>('JWT_SECRET') || 'default_secret',
    });
  }

  // 검증이 성공하면 호출됨. 여기서 반환하는 값이 req.user에 들어감!
  validate(payload: JwtPayload) {
    return { userId: payload.sub, loginId: payload.loginId };
  }
}
