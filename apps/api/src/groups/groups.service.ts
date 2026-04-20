import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import {
  GroupNotificationLevel,
  GroupType,
  MoodStampReactionType,
  ProfileStatus,
  Prisma,
} from '@prisma/client';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateGroupDto } from './dto/create-group.dto.js';
import { getCurrentAliveState, getCurrentBusinessDateJst } from '../me/me.utils.js';
import type { UpdateGroupNotificationSettingsDto } from './dto/update-group-notification-settings.dto.js';

type PrismaTx = Prisma.TransactionClient;
const GROUP_INVITE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface GroupSummary {
  groupId: string;
  name: string;
  type: GroupType;
  iconUrl: string | null;
  memberCount: number;
}

export interface GroupMemberMoodReactions {
  total: number;
  byType: Partial<Record<MoodStampReactionType, number>>;
  myReaction: MoodStampReactionType | null;
}

export interface GroupMemberSummary {
  displayName: string;
  avatarUrl: string | null;
  userId?: string;
  state?: 'checked_in' | 'pending' | 'overdue' | 'monitor_alert';
  lastCheckedInAt?: Date | null;
  mood?: string | null;
  /// その日の気分スタンプ ID (未設定または block 済みメンバーは未返却)
  moodStampId?: string | null;
  /// 気分スタンプへの今日のリアクション集計 (気分未設定時は null)
  moodReactions?: GroupMemberMoodReactions | null;
  isInteractive: boolean;
}

export interface GroupDetail {
  groupId: string;
  name: string;
  type: GroupType;
  iconUrl: string | null;
  members: GroupMemberSummary[];
}

export interface GroupNotificationSettings {
  groupId: string;
  notificationLevel: GroupNotificationLevel;
}

export interface GroupInviteLinkResult {
  groupId: string;
  token: string;
  inviteUrl: string;
  expiresAt: Date;
}

export interface GroupInvitePreview {
  groupId: string;
  groupName: string;
  type: GroupType;
  iconUrl: string | null;
  joinable: boolean;
}

export interface GroupInviteJoinResult {
  groupId: string;
  status: 'joined';
}

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async createGroup(currentUser: User, dto: CreateGroupDto): Promise<GroupSummary> {
    const initialMemberUserIds = dto.initialMemberUserIds ?? [];

    if (initialMemberUserIds.includes(currentUser.userId)) {
      throw new BadRequestException(
        'Creator should not be included in initialMemberUserIds',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const initialMembers = await this.resolveInitialMembers(
        tx,
        currentUser,
        initialMemberUserIds,
      );

      const group = await tx.group.create({
        data: {
          name: dto.name,
          type: dto.type,
          iconUrl: dto.iconUrl ?? null,
          createdByUserId: currentUser.id,
        },
      });

      await tx.groupMember.createMany({
        data: [
          { groupId: group.id, userId: currentUser.id },
          ...initialMembers.map((member) => ({
            groupId: group.id,
            userId: member.id,
          })),
        ],
      });

      return {
        groupId: group.id,
        name: group.name,
        type: group.type,
        iconUrl: group.iconUrl,
        memberCount: initialMembers.length + 1,
      };
    });
  }

  async listGroups(currentUser: User): Promise<GroupSummary[]> {
    const groups = await this.prisma.group.findMany({
      where: {
        members: {
          some: { userId: currentUser.id },
        },
      },
      select: {
        id: true,
        name: true,
        type: true,
        iconUrl: true,
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return groups.map((group) => ({
      groupId: group.id,
      name: group.name,
      type: group.type,
      iconUrl: group.iconUrl,
      memberCount: group._count.members,
    }));
  }

  async getGroupDetail(currentUser: User, groupId: string): Promise<GroupDetail> {
    const now = new Date();
    const currentBusinessDateJst = getCurrentBusinessDateJst(now);
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        members: {
          some: { userId: currentUser.id },
        },
      },
      select: {
        id: true,
        name: true,
        type: true,
        iconUrl: true,
        members: {
          select: {
            user: {
              select: {
                id: true,
                userId: true,
                displayName: true,
                avatarUrl: true,
                dailyCheckins: {
                  select: {
                    checkedInAt: true,
                  },
                  orderBy: { checkedInAt: 'desc' },
                  take: 1,
                },
                dailyMoodStamps: {
                  where: {
                    businessDateJst: currentBusinessDateJst,
                    deletedAt: null,
                  },
                  select: {
                    id: true,
                    mood: true,
                    reactions: {
                      select: {
                        fromUserId: true,
                        reactionType: true,
                      },
                    },
                  },
                  take: 1,
                },
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const blockedMemberIds = await this.findBlockedMemberIds(
      currentUser.id,
      group.members.map((member) => member.user.id),
    );

    return {
      groupId: group.id,
      name: group.name,
      type: group.type,
      iconUrl: group.iconUrl,
      members: group.members.map((member) => {
        if (blockedMemberIds.has(member.user.id)) {
          return {
            displayName: member.user.displayName,
            avatarUrl: member.user.avatarUrl,
            isInteractive: false,
          };
        }

        const lastCheckedInAt = member.user.dailyCheckins[0]?.checkedInAt ?? null;
        const moodStamp = member.user.dailyMoodStamps[0] ?? null;
        return {
          userId: member.user.userId,
          displayName: member.user.displayName,
          avatarUrl: member.user.avatarUrl,
          state: getCurrentAliveState(now, lastCheckedInAt),
          lastCheckedInAt,
          mood: moodStamp?.mood ?? null,
          moodStampId: moodStamp?.id ?? null,
          moodReactions: moodStamp
            ? this.aggregateMoodReactions(moodStamp.reactions, currentUser.id)
            : null,
          isInteractive: true,
        };
      }),
    };
  }

  private aggregateMoodReactions(
    reactions: ReadonlyArray<{
      fromUserId: string;
      reactionType: MoodStampReactionType;
    }>,
    currentUserId: string,
  ): GroupMemberMoodReactions {
    const byType: Partial<Record<MoodStampReactionType, number>> = {};
    let myReaction: MoodStampReactionType | null = null;
    for (const reaction of reactions) {
      byType[reaction.reactionType] = (byType[reaction.reactionType] ?? 0) + 1;
      if (reaction.fromUserId === currentUserId) {
        myReaction = reaction.reactionType;
      }
    }
    return {
      total: reactions.length,
      byType,
      myReaction,
    };
  }

  async getNotificationSettings(
    currentUser: User,
    groupId: string,
  ): Promise<GroupNotificationSettings> {
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        members: {
          some: { userId: currentUser.id },
        },
      },
      select: {
        id: true,
        notificationLevel: true,
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return {
      groupId: group.id,
      notificationLevel: group.notificationLevel,
    };
  }

  async updateNotificationSettings(
    currentUser: User,
    groupId: string,
    dto: UpdateGroupNotificationSettingsDto,
  ): Promise<GroupNotificationSettings> {
    await this.getGroupForMember(this.prisma, groupId, currentUser.id);

    const group = await this.prisma.group.update({
      where: { id: groupId },
      data: {
        notificationLevel: dto.notificationLevel,
      },
      select: {
        id: true,
        notificationLevel: true,
      },
    });

    return {
      groupId: group.id,
      notificationLevel: group.notificationLevel,
    };
  }

  async issueInviteLink(
    currentUser: User,
    groupId: string,
  ): Promise<GroupInviteLinkResult> {
    return this.prisma.$transaction(async (tx) => {
      const group = await this.getGroupForMember(tx, groupId, currentUser.id);
      const now = new Date();

      const currentInvite = await tx.groupInviteLink.findFirst({
        where: {
          groupId,
          usedAt: null,
          revokedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (currentInvite && currentInvite.expiresAt > now) {
        return this.toInviteLinkResult(currentInvite);
      }

      if (currentInvite) {
        await tx.groupInviteLink.update({
          where: { id: currentInvite.id },
          data: { revokedAt: now },
        });
      }

      return this.createInviteLink(tx, group.id, currentUser.id);
    });
  }

  async reissueInviteLink(
    currentUser: User,
    groupId: string,
  ): Promise<GroupInviteLinkResult> {
    return this.prisma.$transaction(async (tx) => {
      const group = await this.getGroupForMember(tx, groupId, currentUser.id);
      const now = new Date();

      await tx.groupInviteLink.updateMany({
        where: {
          groupId: group.id,
          usedAt: null,
          revokedAt: null,
        },
        data: { revokedAt: now },
      });

      return this.createInviteLink(tx, group.id, currentUser.id);
    });
  }

  async previewInvite(
    currentUser: User,
    token: string,
  ): Promise<GroupInvitePreview> {
    const invite = await this.getInviteByToken(token);

    const joinable = await this.canJoinInvite(currentUser, invite);
    return {
      groupId: invite.group.id,
      groupName: invite.group.name,
      type: invite.group.type,
      iconUrl: invite.group.iconUrl,
      joinable,
    };
  }

  async joinWithInvite(
    currentUser: User,
    token: string,
  ): Promise<GroupInviteJoinResult> {
    return this.prisma.$transaction(async (tx) => {
      const invite = await this.getInviteByToken(token, tx);

      if (!this.isInviteJoinable(invite, new Date())) {
        throw new UnprocessableEntityException('Group invite is not joinable');
      }

      const existingMembership = await tx.groupMember.findFirst({
        where: {
          groupId: invite.groupId,
          userId: currentUser.id,
        },
        select: { id: true },
      });
      if (existingMembership) {
        throw new ConflictException('Already joined this group');
      }

      const currentMembers = await tx.groupMember.findMany({
        where: {
          groupId: invite.groupId,
        },
        select: {
          userId: true,
        },
      });

      const memberIds = currentMembers.map((member) => member.userId);
      const blockRelation = await this.findBlockRelation(
        tx,
        currentUser.id,
        memberIds,
      );
      if (blockRelation) {
        throw new UnprocessableEntityException('Group invite is not joinable');
      }

      const usedAt = new Date();
      const updatedInvite = await tx.groupInviteLink.updateMany({
        where: {
          id: invite.id,
          usedAt: null,
          revokedAt: null,
          expiresAt: { gt: usedAt },
        },
        data: { usedAt },
      });
      if (updatedInvite.count !== 1) {
        throw new UnprocessableEntityException('Group invite is not joinable');
      }

      await tx.groupMember.create({
        data: {
          groupId: invite.groupId,
          userId: currentUser.id,
        },
      });

      return {
        groupId: invite.groupId,
        status: 'joined',
      };
    });
  }

  private async resolveInitialMembers(
    tx: PrismaTx,
    currentUser: User,
    initialMemberUserIds: string[],
  ) {
    if (initialMemberUserIds.length === 0) {
      return [];
    }

    const members = await tx.user.findMany({
      where: {
        userId: { in: initialMemberUserIds },
        profileStatus: ProfileStatus.active,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (members.length !== initialMemberUserIds.length) {
      throw new NotFoundException('One or more initial members were not found');
    }

    const allParticipantIds = [currentUser.id, ...members.map((member) => member.id)];
    const blockRelation = await tx.userBlock.findFirst({
      where: {
        blockerUserId: { in: allParticipantIds },
        blockedUserId: { in: allParticipantIds },
      },
      select: { id: true },
    });
    if (blockRelation) {
      throw new UnprocessableEntityException(
        'Blocked users cannot be included in a new group',
      );
    }

    const friendshipPairs = members.map((member) =>
      this.normalizeFriendPair(currentUser.id, member.id),
    );
    const friendships = await tx.friendship.findMany({
      where: {
        OR: friendshipPairs.map(([userLowId, userHighId]) => ({
          userLowId,
          userHighId,
        })),
      },
      select: { id: true },
    });

    if (friendships.length !== members.length) {
      throw new UnprocessableEntityException(
        'Initial members must already be friends with the creator',
      );
    }

    return members;
  }

  private normalizeFriendPair(userAId: string, userBId: string): [string, string] {
    return userAId < userBId ? [userAId, userBId] : [userBId, userAId];
  }

  private async getGroupForMember(
    tx: PrismaTx,
    groupId: string,
    userId: string,
  ) {
    const group = await tx.group.findFirst({
      where: {
        id: groupId,
        members: {
          some: { userId },
        },
      },
      select: {
        id: true,
      },
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    return group;
  }

  private async createInviteLink(
    tx: PrismaTx,
    groupId: string,
    createdByUserId: string,
  ): Promise<GroupInviteLinkResult> {
    try {
      const createdAt = new Date();
      const invite = await tx.groupInviteLink.create({
        data: {
          groupId,
          token: this.generateInviteToken(),
          createdByUserId,
          expiresAt: new Date(createdAt.getTime() + GROUP_INVITE_TTL_MS),
        },
      });

      return this.toInviteLinkResult(invite);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('An active invite link already exists');
      }
      throw err;
    }
  }

  private generateInviteToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private toInviteLinkResult(invite: {
    groupId: string;
    token: string;
    expiresAt: Date;
  }): GroupInviteLinkResult {
    return {
      groupId: invite.groupId,
      token: invite.token,
      inviteUrl: `/group-invites/${invite.token}`,
      expiresAt: invite.expiresAt,
    };
  }

  private async getInviteByToken(token: string, tx?: PrismaTx) {
    const client = tx ?? this.prisma;
    const invite = await client.groupInviteLink.findUnique({
      where: { token },
      select: {
        id: true,
        groupId: true,
        token: true,
        expiresAt: true,
        usedAt: true,
        revokedAt: true,
        group: {
          select: {
            id: true,
            name: true,
            type: true,
            iconUrl: true,
          },
        },
      },
    });
    if (!invite) {
      throw new NotFoundException('Group invite not found');
    }
    return invite;
  }

  private isInviteJoinable(
    invite: {
      expiresAt: Date;
      usedAt: Date | null;
      revokedAt: Date | null;
    },
    now: Date,
  ): boolean {
    return (
      invite.revokedAt === null &&
      invite.usedAt === null &&
      invite.expiresAt > now
    );
  }

  private async canJoinInvite(
    currentUser: User,
    invite: Awaited<ReturnType<GroupsService['getInviteByToken']>>,
  ): Promise<boolean> {
    if (!this.isInviteJoinable(invite, new Date())) {
      return false;
    }

    const [existingMembership, currentMembers] = await Promise.all([
      this.prisma.groupMember.findFirst({
        where: {
          groupId: invite.groupId,
          userId: currentUser.id,
        },
        select: { id: true },
      }),
      this.prisma.groupMember.findMany({
        where: {
          groupId: invite.groupId,
        },
        select: {
          userId: true,
        },
      }),
    ]);

    if (existingMembership) {
      return false;
    }

    const memberIds = currentMembers.map((member) => member.userId);
    const blockRelation = await this.findBlockRelation(
      this.prisma,
      currentUser.id,
      memberIds,
    );

    return !blockRelation;
  }

  private findBlockRelation(
    client: Pick<PrismaTx, 'userBlock'> | Pick<PrismaService, 'userBlock'>,
    userId: string,
    otherUserIds: string[],
  ) {
    if (otherUserIds.length === 0) {
      return Promise.resolve(null);
    }

    return client.userBlock.findFirst({
      where: {
        OR: [
          {
            blockerUserId: userId,
            blockedUserId: { in: otherUserIds },
          },
          {
            blockerUserId: { in: otherUserIds },
            blockedUserId: userId,
          },
        ],
      },
      select: { id: true },
    });
  }

  private async findBlockedMemberIds(
    userId: string,
    otherUserIds: string[],
  ): Promise<Set<string>> {
    const filteredUserIds = otherUserIds.filter((otherUserId) => otherUserId !== userId);
    if (filteredUserIds.length === 0) {
      return new Set();
    }

    const blockRelations = await this.prisma.userBlock.findMany({
      where: {
        OR: [
          {
            blockerUserId: userId,
            blockedUserId: { in: filteredUserIds },
          },
          {
            blockerUserId: { in: filteredUserIds },
            blockedUserId: userId,
          },
        ],
      },
      select: {
        blockerUserId: true,
        blockedUserId: true,
      },
    });

    return new Set(
      blockRelations.map((relation) =>
        relation.blockerUserId === userId
          ? relation.blockedUserId
          : relation.blockerUserId,
      ),
    );
  }
}
