import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthProvider, Prisma, ProfileStatus } from '@prisma/client';
import type { User } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { PasswordService } from './password.service.js';
import { TokenService, type TokenPair } from './token.service.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';

// ── 型定義 ───────────────────────────────────────────────────

export interface UserResponse {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  profileStatus: ProfileStatus;
}

export interface AuthResponse extends TokenPair {
  user: UserResponse;
}

// ── ヘルパー ─────────────────────────────────────────────────

function generateTempUserId(): string {
  return `tmp_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

function isUniqueConstraintError(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
  );
}

// ── Service ──────────────────────────────────────────────────

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
  ) {}

  // ── Public: メール認証 ────────────────────────────────────

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const subject = dto.email.toLowerCase();
    const passwordHash = await this.passwordService.hash(dto.password);

    const { user, isNew } = await this.createUserWithIdentity(
      AuthProvider.email,
      subject,
      passwordHash,
    );

    if (!isNew) {
      throw new ConflictException('Email already registered');
    }

    const tokens = await this.tokenService.issueTokenPair(user.id);
    return { ...tokens, user: this.toUserResponse(user) };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const subject = dto.email.toLowerCase();

    const identity = await this.findIdentity(AuthProvider.email, subject);
    if (!identity || !identity.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await this.passwordService.verify(
      dto.password,
      identity.passwordHash,
    );
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    this.assertUserCanAuthenticate(identity.user);

    const tokens = await this.tokenService.issueTokenPair(identity.user.id);
    return { ...tokens, user: this.toUserResponse(identity.user) };
  }

  // ── Public: セッション管理 ────────────────────────────────

  async refresh(rawToken: string): Promise<TokenPair> {
    const { accessToken, refreshToken } =
      await this.tokenService.rotate(rawToken);
    return { accessToken, refreshToken };
  }

  async logout(rawToken: string): Promise<void> {
    await this.tokenService.revoke(rawToken);
  }

  me(user: User): UserResponse {
    return this.toUserResponse(user);
  }

  // ── Public: ソーシャルログイン ────────────────────────────
  //
  // provider ごとの subject 検証は各 verify service が担い、
  // ここでは get-or-create → token 発行のみを行う。
  // Apple / Google / LINE すべてがこの経路を通る。

  async socialLogin(
    provider: AuthProvider,
    providerSubject: string,
  ): Promise<AuthResponse> {
    const { user } = await this.createUserWithIdentity(provider, providerSubject);
    this.assertUserCanAuthenticate(user);
    const tokens = await this.tokenService.issueTokenPair(user.id);
    return { ...tokens, user: this.toUserResponse(user) };
  }

  // ── 共通認証経路: get or create ───────────────────────────
  //
  // OAuth / email 問わず、すべての認証方式がここを通る。
  //
  // - provider + providerSubject が既存 → 既存 user を返す (isNew: false)
  // - 未存在                           → 新規 user + identity を作成 (isNew: true)
  //
  // Apple / LINE / Google の追加時はコールバックからこの関数を呼ぶだけでよい:
  //   const { user } = await authService.createUserWithIdentity(
  //     AuthProvider.apple, appleSubjectId,
  //   );

  async createUserWithIdentity(
    provider: AuthProvider,
    providerSubject: string,
    passwordHash?: string,
  ): Promise<{ user: User; isNew: boolean }> {
    // ① 既存 identity を確認
    const existing = await this.findIdentity(provider, providerSubject);
    if (existing) {
      this.assertUserCanAuthenticate(existing.user);
      return { user: existing.user, isNew: false };
    }

    // ② 新規作成 (unique 制約の競合を考慮してリトライ)
    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            userId: generateTempUserId(),
            displayName: '',
            profileStatus: ProfileStatus.pending,
          },
        });
        await tx.authIdentity.create({
          data: {
            userId: newUser.id,
            provider,
            providerSubject,
            passwordHash: passwordHash ?? null,
          },
        });
        return newUser;
      });
      return { user, isNew: true };
    } catch (err) {
      // ③ 競合発生時 (別リクエストが同時に作成済み) → 既存を再取得して返す
      if (isUniqueConstraintError(err)) {
        const race = await this.findIdentity(provider, providerSubject);
        if (race) return { user: race.user, isNew: false };
      }
      throw err;
    }
  }

  // ── Private ───────────────────────────────────────────────

  private async findIdentity(provider: AuthProvider, providerSubject: string) {
    return this.prisma.authIdentity.findUnique({
      where: {
        uq_auth_identities_provider_subject: { provider, providerSubject },
      },
      include: { user: true },
    });
  }

  private assertUserCanAuthenticate(user: User): void {
    if (user.profileStatus === ProfileStatus.deactivated) {
      throw new UnauthorizedException('Account is unavailable');
    }
  }

  private toUserResponse(user: User): UserResponse {
    return {
      id: user.id,
      userId: user.userId,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      profileStatus: user.profileStatus,
    };
  }
}
