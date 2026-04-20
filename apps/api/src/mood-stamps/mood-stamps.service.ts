import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { MoodStampReactionType, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { getCurrentBusinessDateJst } from '../me/me.utils.js';

export interface SetMoodStampReactionResult {
  moodStampId: string;
  reactionType: MoodStampReactionType;
}

@Injectable()
export class MoodStampsService {
  constructor(private readonly prisma: PrismaService) {}

  async setReaction(
    currentUser: User,
    moodStampId: string,
    reactionType: MoodStampReactionType,
  ): Promise<SetMoodStampReactionResult> {
    const { target } = await this.assertCanReact(currentUser, moodStampId);

    await this.prisma.moodStampReaction.upsert({
      where: {
        uq_mood_stamp_reactions_stamp_from: {
          moodStampId,
          fromUserId: currentUser.id,
        },
      },
      create: {
        moodStampId,
        fromUserId: currentUser.id,
        toUserId: target.ownerUserId,
        businessDateJst: target.businessDateJst,
        reactionType,
      },
      update: {
        reactionType,
      },
    });

    return {
      moodStampId,
      reactionType,
    };
  }

  async deleteReaction(currentUser: User, moodStampId: string): Promise<void> {
    const deleted = await this.prisma.moodStampReaction.deleteMany({
      where: {
        moodStampId,
        fromUserId: currentUser.id,
      },
    });

    if (deleted.count !== 1) {
      throw new NotFoundException('Reaction not found');
    }
  }

  /// 反応可能な条件:
  /// - 対象 mood stamp が存在し、soft-delete されていない
  /// - 対象が今日の business date と一致する (履歴化防止)
  /// - 自分の mood stamp ではない
  /// - 相手と双方向 block 関係がない
  /// - 相手と友達 OR 同一グループに所属
  private async assertCanReact(currentUser: User, moodStampId: string) {
    const now = new Date();
    const businessDateJst = getCurrentBusinessDateJst(now);

    const moodStamp = await this.prisma.dailyMoodStamp.findUnique({
      where: { id: moodStampId },
      select: {
        id: true,
        userId: true,
        businessDateJst: true,
        deletedAt: true,
      },
    });

    if (!moodStamp || moodStamp.deletedAt !== null) {
      throw new NotFoundException('Mood stamp not found');
    }
    if (moodStamp.businessDateJst !== businessDateJst) {
      throw new BadRequestException('Reactions are only allowed for today');
    }
    if (moodStamp.userId === currentUser.id) {
      throw new BadRequestException('Cannot react to your own mood stamp');
    }

    const [blockRelation, friendship, sharedGroup] = await Promise.all([
      this.prisma.userBlock.findFirst({
        where: {
          OR: [
            { blockerUserId: currentUser.id, blockedUserId: moodStamp.userId },
            { blockerUserId: moodStamp.userId, blockedUserId: currentUser.id },
          ],
        },
        select: { id: true },
      }),
      this.prisma.friendship.findUnique({
        where: {
          uq_friendships_pair: this.friendPair(currentUser.id, moodStamp.userId),
        },
        select: { id: true },
      }),
      this.prisma.group.findFirst({
        where: {
          members: { some: { userId: currentUser.id } },
          AND: { members: { some: { userId: moodStamp.userId } } },
        },
        select: { id: true },
      }),
    ]);

    if (blockRelation) {
      throw new ForbiddenException('Blocked relationship');
    }
    if (!friendship && !sharedGroup) {
      throw new ForbiddenException('Not allowed to react to this user');
    }

    return {
      target: {
        ownerUserId: moodStamp.userId,
        businessDateJst: moodStamp.businessDateJst,
      },
    };
  }

  private friendPair(
    userAId: string,
    userBId: string,
  ): { userLowId: string; userHighId: string } {
    return userAId < userBId
      ? { userLowId: userAId, userHighId: userBId }
      : { userLowId: userBId, userHighId: userAId };
  }
}
