import { ConflictException, Injectable } from '@nestjs/common';
import {
  AuthProvider,
  IdSearchVisibility,
  Prisma,
  ProfileStatus,
} from '@prisma/client';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import type { UserResponse } from './auth.service.js';
import type { InitialProfileDto } from './dto/initial-profile.dto.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';
import type { UpdateAccountSettingsDto } from './dto/update-account-settings.dto.js';

const USER_ID_CHANGE_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;

export interface AccountSettingsResponse {
  userId: string;
  idSearchVisibility: IdSearchVisibility;
  userIdChangedAt: Date | null;
  nextUserIdChangeAvailableAt: Date | null;
  authProviders: AuthProvider[];
  emailAddress: string | null;
  createdAt: Date;
}

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 初回プロフィール設定を完了させる。
   *
   * - pending ユーザー専用: 既に active / deactivated の場合は ConflictException
   * - displayName / avatarUrl / userId を一括更新
   * - profileStatus を active に遷移
   * - userIdChangedAt を現在時刻でセット
   *
   * userIdChangedAt の方針:
   *   初回設定時も userIdChangedAt をセットする。
   *   後続 Step で「初回設定を 30 日変更制限に含めるか」を見直す場合は
   *   このメソッド内の userIdChangedAt 代入だけを変更すれば済むよう、
   *   ロジックをこの service 層に閉じている。
   */
  async completeInitialProfile(
    user: User,
    dto: InitialProfileDto,
  ): Promise<UserResponse> {
    if (user.profileStatus !== ProfileStatus.pending) {
      throw new ConflictException('Profile already completed');
    }

    try {
      const updated = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          displayName: dto.displayName,
          avatarUrl: dto.avatarUrl ?? null,
          userId: dto.userId,
          profileStatus: ProfileStatus.active,
          userIdChangedAt: new Date(),
        },
      });

      return {
        id: updated.id,
        userId: updated.userId,
        displayName: updated.displayName,
        avatarUrl: updated.avatarUrl,
        profileStatus: updated.profileStatus,
      };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        // users.user_id の unique 制約違反 → 業務エラーとして返す
        throw new ConflictException('User ID already taken');
      }
      throw err;
    }
  }

  async updateProfile(user: User, dto: UpdateProfileDto): Promise<UserResponse> {
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        displayName: dto.displayName,
        avatarUrl: dto.avatarUrl ?? null,
      },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      displayName: updated.displayName,
      avatarUrl: updated.avatarUrl,
      profileStatus: updated.profileStatus,
    };
  }

  async getAccountSettings(user: User): Promise<AccountSettingsResponse> {
    const current = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        userId: true,
        idSearchVisibility: true,
        userIdChangedAt: true,
        createdAt: true,
        authIdentities: {
          select: {
            provider: true,
            providerSubject: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    return this.toAccountSettingsResponse(current);
  }

  async updateAccountSettings(
    user: User,
    dto: UpdateAccountSettingsDto,
  ): Promise<AccountSettingsResponse> {
    const current = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        id: true,
        userId: true,
        idSearchVisibility: true,
        userIdChangedAt: true,
        createdAt: true,
      },
    });

    const now = new Date();
    const data: Prisma.UserUpdateInput = {};

    if (dto.userId !== undefined && dto.userId !== current.userId) {
      const nextAllowedAt = this.resolveNextUserIdChangeAvailableAt(
        current.userIdChangedAt,
      );

      if (nextAllowedAt && nextAllowedAt > now) {
        throw new ConflictException('User ID can be changed once every 30 days');
      }

      data.userId = dto.userId;
      data.userIdChangedAt = now;
    }

    if (
      dto.idSearchVisibility !== undefined &&
      dto.idSearchVisibility !== current.idSearchVisibility
    ) {
      data.idSearchVisibility = dto.idSearchVisibility;
    }

    if (Object.keys(data).length > 0) {
      try {
        await this.prisma.user.update({
          where: { id: current.id },
          data,
        });
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          throw new ConflictException('User ID already taken');
        }
        throw err;
      }
    }

    return this.getAccountSettings(user);
  }

  private toAccountSettingsResponse(user: {
    userId: string;
    idSearchVisibility: IdSearchVisibility;
    userIdChangedAt: Date | null;
    createdAt: Date;
    authIdentities: Array<{
      provider: AuthProvider;
      providerSubject: string;
    }>;
  }): AccountSettingsResponse {
    return {
      userId: user.userId,
      idSearchVisibility: user.idSearchVisibility,
      userIdChangedAt: user.userIdChangedAt,
      nextUserIdChangeAvailableAt: this.resolveNextUserIdChangeAvailableAt(
        user.userIdChangedAt,
      ),
      authProviders: user.authIdentities.map((identity) => identity.provider),
      emailAddress:
        user.authIdentities.find((identity) => identity.provider === AuthProvider.email)
          ?.providerSubject ?? null,
      createdAt: user.createdAt,
    };
  }

  private resolveNextUserIdChangeAvailableAt(
    userIdChangedAt: Date | null,
  ): Date | null {
    if (!userIdChangedAt) {
      return null;
    }

    return new Date(userIdChangedAt.getTime() + USER_ID_CHANGE_INTERVAL_MS);
  }
}
