import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { User } from '@prisma/client';
import { AuthProvider } from '@prisma/client';
import { AuthService } from './auth.service.js';
import { ProfileService } from './profile.service.js';
import { AppleVerifyService } from './social/apple-verify.service.js';
import { GoogleVerifyService } from './social/google-verify.service.js';
import { LineVerifyService } from './social/line-verify.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { ActiveProfileGuard } from './guards/active-profile.guard.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshDto } from './dto/refresh.dto.js';
import { InitialProfileDto } from './dto/initial-profile.dto.js';
import { AppleLoginDto } from './dto/apple-login.dto.js';
import { GoogleLoginDto } from './dto/google-login.dto.js';
import { LineLoginDto } from './dto/line-login.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UpdateAccountSettingsDto } from './dto/update-account-settings.dto.js';

interface AuthRequest extends FastifyRequest {
  user: User;
}

@Controller('auth')
export class AuthController {
  // [LINE DEBUG]
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly profileService: ProfileService,
    private readonly appleVerify: AppleVerifyService,
    private readonly googleVerify: GoogleVerifyService,
    private readonly lineVerify: LineVerifyService,
  ) {}

  /** メール + パスワード 新規登録 */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /** メール + パスワード ログイン */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /** Refresh Token rotate → 新しい Access / Refresh Token を返す */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  /** ログアウト: Refresh Token を無効化する */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshDto) {
    await this.authService.logout(dto.refreshToken);
  }

  /**
   * 初回プロフィール設定 (pending → active)
   * - Access Token 認証必須
   * - pending ユーザー専用: 既に active の場合は 409
   */
  @Patch('initial-profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  initialProfile(
    @Request() req: AuthRequest,
    @Body() dto: InitialProfileDto,
  ) {
    return this.profileService.completeInitialProfile(req.user, dto);
  }

  /** 現在ユーザー取得 (Access Token 認証必須) */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Request() req: AuthRequest) {
    return this.authService.me(req.user);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard, ActiveProfileGuard)
  @HttpCode(HttpStatus.OK)
  updateProfile(
    @Request() req: AuthRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(req.user, dto);
  }

  @Get('account-settings')
  @UseGuards(JwtAuthGuard, ActiveProfileGuard)
  getAccountSettings(@Request() req: AuthRequest) {
    return this.profileService.getAccountSettings(req.user);
  }

  @Patch('account-settings')
  @UseGuards(JwtAuthGuard, ActiveProfileGuard)
  @HttpCode(HttpStatus.OK)
  updateAccountSettings(
    @Request() req: AuthRequest,
    @Body() dto: UpdateAccountSettingsDto,
  ) {
    return this.profileService.updateAccountSettings(req.user, dto);
  }

  // ── ソーシャルログイン ─────────────────────────────────────
  // provider 固有の検証 (verify service) → 共通ログイン経路 (socialLogin)
  // 既存 identity: 既存 user を返す / 未存在: pending user を新規作成

  /** Apple Sign In */
  @Post('apple')
  @HttpCode(HttpStatus.OK)
  async appleLogin(@Body() dto: AppleLoginDto) {
    const subject = await this.appleVerify.verify(dto.identityToken);
    return this.authService.socialLogin(AuthProvider.apple, subject);
  }

  /** Google Sign In */
  @Post('google')
  @HttpCode(HttpStatus.OK)
  async googleLogin(@Body() dto: GoogleLoginDto) {
    const subject = await this.googleVerify.verify(dto.idToken);
    return this.authService.socialLogin(AuthProvider.google, subject);
  }

  /** LINE ログイン */
  @Post('line')
  @HttpCode(HttpStatus.OK)
  async lineLogin(@Body() dto: LineLoginDto) {
    // [LINE DEBUG] DTO 到達確認
    this.logger.log(`[LINE] /auth/line hit | accessToken present: ${Boolean(dto.accessToken)} | length: ${dto.accessToken?.length ?? 0} | prefix: ${dto.accessToken?.slice(0, 8) ?? 'none'}`);
    const subject = await this.lineVerify.verify(dto.accessToken);
    return this.authService.socialLogin(AuthProvider.line, subject);
  }
}
