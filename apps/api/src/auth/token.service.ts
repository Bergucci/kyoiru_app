import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { ProfileStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

/** Refresh Token の有効期間 (30 日) */
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // ── Access Token ──────────────────────────────────────────

  issueAccessToken(userId: string): string {
    return this.jwtService.sign({ sub: userId });
  }

  // ── Refresh Token ─────────────────────────────────────────

  async issueRefreshToken(userId: string): Promise<string> {
    const raw = randomBytes(32).toString('hex');
    const hash = this.hash(raw);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash: hash, expiresAt },
    });

    return raw;
  }

  async issueTokenPair(userId: string): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      Promise.resolve(this.issueAccessToken(userId)),
      this.issueRefreshToken(userId),
    ]);
    return { accessToken, refreshToken };
  }

  // ── Rotate ────────────────────────────────────────────────

  /**
   * Refresh Token を rotate する。
   * - 既存トークンを無効化
   * - 新しい Access Token + Refresh Token を発行
   */
  async rotate(rawToken: string): Promise<TokenPair & { userId: string }> {
    const hash = this.hash(rawToken);
    const now = new Date();

    // 有効なトークンにだけ成功する条件付き更新 (atomic revoke)
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hash, revokedAt: null, expiresAt: { gt: now } },
      data: { revokedAt: now },
    });

    if (count === 0) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // revoke 成功後に userId を取得して新しい pair を発行
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hash },
      select: {
        userId: true,
        user: {
          select: {
            profileStatus: true,
          },
        },
      },
    });

    if (!stored || stored.user.profileStatus === ProfileStatus.deactivated) {
      throw new UnauthorizedException('Account is unavailable');
    }

    const pair = await this.issueTokenPair(stored.userId);
    return { ...pair, userId: stored.userId };
  }

  // ── Revoke (logout) ───────────────────────────────────────

  async revoke(rawToken: string): Promise<void> {
    const hash = this.hash(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string, revokedAt: Date = new Date()): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt,
      },
    });
  }

  // ── Private ───────────────────────────────────────────────

  private hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
