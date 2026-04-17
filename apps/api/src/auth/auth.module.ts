import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { ProfileService } from './profile.service.js';
import { TokenService } from './token.service.js';
import { PasswordService } from './password.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { AppleVerifyService } from './social/apple-verify.service.js';
import { GoogleVerifyService } from './social/google-verify.service.js';
import { LineVerifyService } from './social/line-verify.service.js';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    ProfileService,
    TokenService,
    PasswordService,
    JwtStrategy,
    AppleVerifyService,
    GoogleVerifyService,
    LineVerifyService,
  ],
})
export class AuthModule {}
