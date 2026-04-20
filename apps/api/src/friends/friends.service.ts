import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import {
  FriendRequestStatus,
  IdSearchVisibility,
  MonitoringRelationshipStatus,
  Prisma,
  ProfileStatus,
} from '@prisma/client';
import type { User } from '@prisma/client';
import {
  checkFriendRequestConstraints,
  getBusinessDayStartUtc,
  toJstParts,
} from '@kyoiru/domain';
import { PrismaService } from '../prisma/prisma.service.js';
import type { SearchUserDto } from './dto/search-user.dto.js';
import type { BlockUserDto } from './dto/block-user.dto.js';
import type { SendRequestDto } from './dto/send-request.dto.js';

// ── 定数 ─────────────────────────────────────────────────

const DAILY_REQUEST_LIMIT = 30;
const REJECT_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
const REJECT_REVERT_WINDOW_MS = 24 * 60 * 60 * 1000;
const SEARCH_RESULT_LIMIT = 20;
const FRIEND_INVITE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// ── 型 ───────────────────────────────────────────────────

type PrismaTx = Prisma.TransactionClient;

export interface UserSearchResult {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface FriendRequestResult {
  requestId: string;
  status: FriendRequestStatus;
}

export interface FriendRequestUserSummary {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface FriendRequestListItem {
  requestId: string;
  from: FriendRequestUserSummary;
  to: FriendRequestUserSummary;
  status: FriendRequestStatus;
  createdAt: Date;
}

export interface FriendListItem {
  friendshipId: string;
  friendedAt: Date;
  latestCheckinAt: Date | null;
  latestMood: string | null;
  friend: FriendRequestUserSummary;
}

export interface BlockUserResult {
  targetUserId: string;
  result: 'blocked' | 'already_blocked';
}

export interface BlockListItem {
  blockId: string;
  blockedAt: Date;
  target: FriendRequestUserSummary;
}

export interface UnblockResult {
  blockId: string;
  status: 'unblocked';
}

export interface FriendInviteLinkResult {
  token: string;
  invitePath: string;
  inviteUrl: string;
  expiresAt: Date;
  shareText: string;
  lineShareUrl: string;
}

export interface FriendInvitePreview {
  inviter: FriendRequestUserSummary;
  joinable: boolean;
}

export interface FriendInviteAcceptResult {
  inviter: FriendRequestUserSummary;
  status: 'friends';
}

// ── Service ──────────────────────────────────────────────

@Injectable()
export class FriendsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── ID 検索 ───────────────────────────────────────────

  /**
   * userId の前方一致でユーザーを検索する。
   *
   * 除外条件:
   *   - 自分自身
   *   - idSearchVisibility = private
   *   - 自分が block している相手
   *   - 自分を block している相手
   *   - profileStatus != active (pending / deactivated)
   *
   * 返す情報: userId / displayName / avatarUrl のみ
   */
  async searchUsers(
    currentUser: User,
    dto: SearchUserDto,
  ): Promise<UserSearchResult[]> {
    return this.prisma.user.findMany({
      where: {
        userId: { equals: dto.userId },
        id: { not: currentUser.id },
        idSearchVisibility: IdSearchVisibility.public,
        profileStatus: ProfileStatus.active,
        // 自分を block している相手を除外
        // (blocksGiven = 相手が「与えた block」の中に「自分」がいない)
        blocksGiven: { none: { blockedUserId: currentUser.id } },
        // 自分が block している相手を除外
        // (blocksReceived = 相手が「受けた block」の中に「自分が block した」がいない)
        blocksReceived: { none: { blockerUserId: currentUser.id } },
      },
      select: {
        userId: true,
        displayName: true,
        avatarUrl: true,
      },
      take: SEARCH_RESULT_LIMIT,
    });
  }

  // ── 友達申請送信 ──────────────────────────────────────

  /**
   * 友達申請を送信する。
   *
   * 送信前チェック順序:
   *   1. 自分自身への申請を拒否 (400)
   *   2. 相手の存在確認 (404)
   *   3. block 関係 → 404 で情報隠蔽
   *   4. 既に友達 (422)
   *   5. 既に pending 申請あり (双方向チェック) (422)
   *   6. 1 日 30 件制限 (429)
   *   7. 拒否後 30 日再申請不可 (422)
   *   8. 通過 → friendship_requests に pending 作成
   *
   * already_pending は DB 例外任せにせず、事前クエリで判定する。
   * 競合時は P2002 catch で追加カバー。
   */
  async sendRequest(
    sender: User,
    dto: SendRequestDto,
  ): Promise<FriendRequestResult> {
    // ── 1. 自分自身 ────────────────────────────────────
    if (sender.userId === dto.targetUserId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    // ── 2. 相手の存在確認 ──────────────────────────────
    const target = await this.prisma.user.findFirst({
      where: {
        userId: dto.targetUserId,
        profileStatus: ProfileStatus.active,
        idSearchVisibility: IdSearchVisibility.public,
      },
    });
    if (!target) {
      throw new NotFoundException('User not found');
    }

    // ── 3–7. 並列で制約チェック用データ取得 ───────────
    const now = new Date();
    const businessDayStart = getBusinessDayStartUtc(now);
    const rejectCutoff = new Date(now.getTime() - REJECT_COOLDOWN_MS);

    // friendships は (low, high) 正規化
    const [lowId, highId] =
      sender.id < target.id
        ? [sender.id, target.id]
        : [target.id, sender.id];

    const [blockRelation, friendship, pendingRequest, dailyCount, recentReject] =
      await Promise.all([
        // block 関係 (双方向)
        this.prisma.userBlock.findFirst({
          where: {
            OR: [
              { blockerUserId: sender.id, blockedUserId: target.id },
              { blockerUserId: target.id, blockedUserId: sender.id },
            ],
          },
        }),
        // 既に友達か
        this.prisma.friendship.findUnique({
          where: {
            uq_friendships_pair: { userLowId: lowId, userHighId: highId },
          },
        }),
        // pending 申請が既にあるか (双方向: A→B / B→A どちらも対象)
        this.prisma.friendshipRequest.findFirst({
          where: {
            status: FriendRequestStatus.pending,
            OR: [
              { senderUserId: sender.id, receiverUserId: target.id },
              { senderUserId: target.id, receiverUserId: sender.id },
            ],
          },
        }),
        // 本日 (JST 朝 6:00 起点) の送信件数
        this.prisma.friendshipRequest.count({
          where: {
            senderUserId: sender.id,
            createdAt: { gte: businessDayStart },
          },
        }),
        // 過去 30 日以内に同一相手から reject されたか
        this.prisma.friendshipRequest.findFirst({
          where: {
            senderUserId: sender.id,
            receiverUserId: target.id,
            status: FriendRequestStatus.rejected,
            rejectedAt: { gte: rejectCutoff },
          },
        }),
      ]);

    // ── 3. block → 404 (情報漏洩防止: block の存在を開示しない) ─
    if (blockRelation) {
      throw new NotFoundException('User not found');
    }

    // ── 4, 5. domain 制約 (already_friends / already_pending) ────
    // block は上で処理済みのため両フラグは false で渡す
    const violation = checkFriendRequestConstraints({
      targetBlocksMe: false,
      iBlockTarget: false,
      alreadyFriends: !!friendship,
      alreadyPending: !!pendingRequest,
    });

    if (violation === 'already_friends') {
      throw new UnprocessableEntityException('Already friends');
    }
    if (violation === 'already_pending') {
      throw new UnprocessableEntityException('Friend request already pending');
    }

    // ── 6. 1 日 30 件制限 ────────────────────────────
    if (dailyCount >= DAILY_REQUEST_LIMIT) {
      throw new HttpException(
        'Daily friend request limit reached',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // ── 7. 拒否後 30 日再申請不可 ─────────────────────
    if (recentReject) {
      throw new UnprocessableEntityException(
        'Cannot send request within 30 days of rejection',
      );
    }

    // ── 8. 全チェック通過 → pending 作成 ──────────────
    try {
      const request = await this.prisma.friendshipRequest.create({
        data: {
          senderUserId: sender.id,
          receiverUserId: target.id,
          status: FriendRequestStatus.pending,
        },
      });
      return { requestId: request.id, status: request.status };
    } catch (err) {
      // 競合: 並行リクエストで partial unique index (sender, receiver, pending) 違反
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new UnprocessableEntityException('Friend request already pending');
      }
      throw err;
    }
  }

  async getIncomingPendingRequests(
    receiver: User,
  ): Promise<FriendRequestListItem[]> {
    const requests = await this.prisma.friendshipRequest.findMany({
      where: {
        receiverUserId: receiver.id,
        status: FriendRequestStatus.pending,
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        sender: {
          select: {
            userId: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        receiver: {
          select: {
            userId: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map((request) => this.toFriendRequestListItem(request));
  }

  async getOutgoingPendingRequests(
    sender: User,
  ): Promise<FriendRequestListItem[]> {
    const requests = await this.prisma.friendshipRequest.findMany({
      where: {
        senderUserId: sender.id,
        status: FriendRequestStatus.pending,
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        sender: {
          select: {
            userId: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        receiver: {
          select: {
            userId: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map((request) => this.toFriendRequestListItem(request));
  }

  async listFriends(currentUser: User): Promise<FriendListItem[]> {
    const now = new Date();
    const bds = getBusinessDayStartUtc(now);
    const { year, month, day } = toJstParts(bds);
    const businessDateJst = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [{ userLowId: currentUser.id }, { userHighId: currentUser.id }],
      },
      select: {
        id: true,
        createdAt: true,
        userLow: {
          select: {
            id: true,
            userId: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        userHigh: {
          select: {
            id: true,
            userId: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const friendUserIds = friendships.map((f) =>
      f.userLow.id === currentUser.id ? f.userHigh.id : f.userLow.id,
    );

    const [checkins, moodStamps] = await Promise.all([
      this.prisma.dailyCheckin.findMany({
        where: {
          userId: { in: friendUserIds },
          businessDateJst,
        },
        select: { userId: true, checkedInAt: true },
      }),
      this.prisma.dailyMoodStamp.findMany({
        where: {
          userId: { in: friendUserIds },
          businessDateJst,
          deletedAt: null,
        },
        select: { userId: true, mood: true },
      }),
    ]);

    const checkinByUserId = new Map(checkins.map((c) => [c.userId, c.checkedInAt]));
    const moodByUserId = new Map(moodStamps.map((m) => [m.userId, m.mood]));

    return friendships.map((friendship) => {
      const friend =
        friendship.userLow.id === currentUser.id
          ? friendship.userHigh
          : friendship.userLow;

      return {
        friendshipId: friendship.id,
        friendedAt: friendship.createdAt,
        latestCheckinAt: checkinByUserId.get(friend.id) ?? null,
        latestMood: moodByUserId.get(friend.id) ?? null,
        friend: {
          userId: friend.userId,
          displayName: friend.displayName,
          avatarUrl: friend.avatarUrl,
        },
      };
    });
  }

  async acceptRequest(
    receiver: User,
    requestId: string,
  ): Promise<FriendRequestResult> {
    return this.prisma.$transaction(async (tx) => {
      const request = await this.getRequestForReceiver(tx, receiver.id, requestId);

      if (request.status !== FriendRequestStatus.pending) {
        throw new ConflictException('Friend request is not pending');
      }

      const now = new Date();
      const blockRelation = await tx.userBlock.findFirst({
        where: {
          OR: [
            {
              blockerUserId: receiver.id,
              blockedUserId: request.senderUserId,
            },
            {
              blockerUserId: request.senderUserId,
              blockedUserId: receiver.id,
            },
          ],
        },
      });
      if (blockRelation) {
        throw new NotFoundException('Friend request not found');
      }

      const updated = await tx.friendshipRequest.updateMany({
        where: {
          id: requestId,
          receiverUserId: receiver.id,
          status: FriendRequestStatus.pending,
        },
        data: {
          status: FriendRequestStatus.accepted,
          respondedAt: now,
          cancelledAt: null,
          rejectedAt: null,
          rejectionRevertDeadlineAt: null,
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Friend request is not pending');
      }

      const [userLowId, userHighId] = this.normalizeFriendPair(
        request.senderUserId,
        receiver.id,
      );

      await tx.friendship.upsert({
        where: {
          uq_friendships_pair: { userLowId, userHighId },
        },
        update: {},
        create: { userLowId, userHighId },
      });

      return {
        requestId,
        status: FriendRequestStatus.accepted,
      };
    });
  }

  async rejectRequest(
    receiver: User,
    requestId: string,
  ): Promise<FriendRequestResult> {
    return this.prisma.$transaction(async (tx) => {
      const request = await this.getRequestForReceiver(tx, receiver.id, requestId);

      if (request.status !== FriendRequestStatus.pending) {
        throw new ConflictException('Friend request is not pending');
      }

      const now = new Date();
      const updated = await tx.friendshipRequest.updateMany({
        where: {
          id: requestId,
          receiverUserId: receiver.id,
          status: FriendRequestStatus.pending,
        },
        data: {
          status: FriendRequestStatus.rejected,
          respondedAt: now,
          cancelledAt: null,
          rejectedAt: now,
          rejectionRevertDeadlineAt: new Date(
            now.getTime() + REJECT_REVERT_WINDOW_MS,
          ),
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Friend request is not pending');
      }

      return {
        requestId,
        status: FriendRequestStatus.rejected,
      };
    });
  }

  async cancelRequest(
    sender: User,
    requestId: string,
  ): Promise<FriendRequestResult> {
    return this.prisma.$transaction(async (tx) => {
      const request = await this.getRequestForSender(tx, sender.id, requestId);

      if (request.status !== FriendRequestStatus.pending) {
        throw new ConflictException('Friend request is not pending');
      }

      const now = new Date();
      const updated = await tx.friendshipRequest.updateMany({
        where: {
          id: requestId,
          senderUserId: sender.id,
          status: FriendRequestStatus.pending,
        },
        data: {
          status: FriendRequestStatus.cancelled,
          cancelledAt: now,
          respondedAt: null,
          rejectedAt: null,
          rejectionRevertDeadlineAt: null,
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Friend request is not pending');
      }

      return {
        requestId,
        status: FriendRequestStatus.cancelled,
      };
    });
  }

  async revertRejectedRequest(
    receiver: User,
    requestId: string,
  ): Promise<FriendRequestResult> {
    return this.prisma.$transaction(async (tx) => {
      const request = await this.getRequestForReceiver(tx, receiver.id, requestId);

      if (request.status !== FriendRequestStatus.rejected) {
        throw new ConflictException('Friend request is not rejected');
      }
      if (
        !request.rejectionRevertDeadlineAt ||
        request.rejectionRevertDeadlineAt <= new Date()
      ) {
        throw new ConflictException('Reject revert window has expired');
      }

      const updated = await tx.friendshipRequest.updateMany({
        where: {
          id: requestId,
          receiverUserId: receiver.id,
          status: FriendRequestStatus.rejected,
          rejectionRevertDeadlineAt: { gt: new Date() },
        },
        data: {
          status: FriendRequestStatus.pending,
          respondedAt: null,
          cancelledAt: null,
          rejectedAt: null,
          rejectionRevertDeadlineAt: null,
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Reject revert window has expired');
      }

      return {
        requestId,
        status: FriendRequestStatus.pending,
      };
    });
  }

  async blockUser(
    blocker: User,
    dto: BlockUserDto,
  ): Promise<BlockUserResult> {
    if (blocker.userId === dto.targetUserId) {
      throw new BadRequestException('Cannot block yourself');
    }

    return this.prisma.$transaction(async (tx) => {
      const target = await tx.user.findFirst({
        where: {
          userId: dto.targetUserId,
          profileStatus: ProfileStatus.active,
        },
        select: {
          id: true,
          userId: true,
        },
      });
      if (!target) {
        throw new NotFoundException('User not found');
      }

      let result: BlockUserResult['result'] = 'blocked';
      try {
        await tx.userBlock.create({
          data: {
            blockerUserId: blocker.id,
            blockedUserId: target.id,
          },
        });
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          result = 'already_blocked';
        } else {
          throw err;
        }
      }

      const [userLowId, userHighId] = this.normalizeFriendPair(
        blocker.id,
        target.id,
      );

      await tx.friendship.deleteMany({
        where: {
          userLowId,
          userHighId,
        },
      });

      const now = new Date();
      await tx.friendshipRequest.updateMany({
        where: {
          status: FriendRequestStatus.pending,
          OR: [
            {
              senderUserId: blocker.id,
              receiverUserId: target.id,
            },
            {
              senderUserId: target.id,
              receiverUserId: blocker.id,
            },
          ],
        },
        data: {
          status: FriendRequestStatus.cancelled,
          cancelledAt: now,
          respondedAt: null,
          rejectedAt: null,
          rejectionRevertDeadlineAt: null,
        },
      });

      await this.stopAliveMonitoringRelations(tx, blocker.id, target.id);

      return {
        targetUserId: target.userId,
        result,
      };
    });
  }

  async listBlocks(currentUser: User): Promise<BlockListItem[]> {
    const blocks = await this.prisma.userBlock.findMany({
      where: {
        blockerUserId: currentUser.id,
      },
      select: {
        id: true,
        createdAt: true,
        blocked: {
          select: {
            userId: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return blocks.map((block) => ({
      blockId: block.id,
      blockedAt: block.createdAt,
      target: block.blocked,
    }));
  }

  async unblockUser(currentUser: User, blockId: string): Promise<UnblockResult> {
    const deleted = await this.prisma.userBlock.deleteMany({
      where: {
        id: blockId,
        blockerUserId: currentUser.id,
      },
    });

    if (deleted.count !== 1) {
      throw new NotFoundException('Block not found');
    }

    return {
      blockId,
      status: 'unblocked',
    };
  }

  async issueFriendInviteLink(currentUser: User): Promise<FriendInviteLinkResult> {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const currentInvite = await tx.friendInviteLink.findFirst({
        where: {
          createdByUserId: currentUser.id,
          usedAt: null,
          revokedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (currentInvite && currentInvite.expiresAt > now) {
        return this.toFriendInviteLinkResult(currentInvite, currentUser.displayName);
      }

      if (currentInvite) {
        await tx.friendInviteLink.update({
          where: { id: currentInvite.id },
          data: { revokedAt: now },
        });
      }

      return this.createFriendInviteLink(tx, currentUser.id, currentUser.displayName);
    });
  }

  async reissueFriendInviteLink(
    currentUser: User,
  ): Promise<FriendInviteLinkResult> {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();

      await tx.friendInviteLink.updateMany({
        where: {
          createdByUserId: currentUser.id,
          usedAt: null,
          revokedAt: null,
        },
        data: { revokedAt: now },
      });

      return this.createFriendInviteLink(tx, currentUser.id, currentUser.displayName);
    });
  }

  async previewFriendInvite(
    currentUser: User,
    token: string,
  ): Promise<FriendInvitePreview> {
    const invite = await this.getFriendInviteByToken(token);
    const joinable = await this.canAcceptFriendInvite(currentUser, invite);

    return {
      inviter: invite.createdBy,
      joinable,
    };
  }

  async acceptFriendInvite(
    currentUser: User,
    token: string,
  ): Promise<FriendInviteAcceptResult> {
    return this.prisma.$transaction(async (tx) => {
      const invite = await this.getFriendInviteByToken(token, tx);
      const usedAt = new Date();

      if (!this.isFriendInviteJoinable(invite, usedAt)) {
        throw new UnprocessableEntityException('Friend invite is not joinable');
      }

      if (invite.createdBy.id === currentUser.id) {
        throw new UnprocessableEntityException('Friend invite is not joinable');
      }

      const blockRelation = await this.findBlockRelationBetweenUsers(
        tx,
        currentUser.id,
        invite.createdBy.id,
      );
      if (blockRelation) {
        throw new UnprocessableEntityException('Friend invite is not joinable');
      }

      const existingFriendship = await this.getFriendship(
        tx,
        currentUser.id,
        invite.createdBy.id,
      );
      if (existingFriendship) {
        throw new ConflictException('Already friends');
      }

      const updatedInvite = await tx.friendInviteLink.updateMany({
        where: {
          id: invite.id,
          usedAt: null,
          revokedAt: null,
          expiresAt: { gt: usedAt },
        },
        data: { usedAt },
      });
      if (updatedInvite.count !== 1) {
        throw new UnprocessableEntityException('Friend invite is not joinable');
      }

      const [userLowId, userHighId] = this.normalizeFriendPair(
        currentUser.id,
        invite.createdBy.id,
      );

      await tx.friendship.upsert({
        where: {
          uq_friendships_pair: { userLowId, userHighId },
        },
        update: {},
        create: { userLowId, userHighId },
      });

      await tx.friendshipRequest.updateMany({
        where: {
          status: FriendRequestStatus.pending,
          OR: [
            {
              senderUserId: currentUser.id,
              receiverUserId: invite.createdBy.id,
            },
            {
              senderUserId: invite.createdBy.id,
              receiverUserId: currentUser.id,
            },
          ],
        },
        data: {
          status: FriendRequestStatus.cancelled,
          cancelledAt: usedAt,
          respondedAt: null,
          rejectedAt: null,
          rejectionRevertDeadlineAt: null,
        },
      });

      return {
        inviter: invite.createdBy,
        status: 'friends',
      };
    });
  }

  private toFriendRequestListItem(request: {
    id: string;
    status: FriendRequestStatus;
    createdAt: Date;
    sender: FriendRequestUserSummary;
    receiver: FriendRequestUserSummary;
  }): FriendRequestListItem {
    return {
      requestId: request.id,
      from: request.sender,
      to: request.receiver,
      status: request.status,
      createdAt: request.createdAt,
    };
  }

  private async getRequestForReceiver(
    tx: PrismaTx,
    receiverUserId: string,
    requestId: string,
  ) {
    const request = await tx.friendshipRequest.findFirst({
      where: {
        id: requestId,
        receiverUserId,
      },
      select: {
        id: true,
        senderUserId: true,
        receiverUserId: true,
        status: true,
        rejectionRevertDeadlineAt: true,
      },
    });
    if (!request) {
      throw new NotFoundException('Friend request not found');
    }
    return request;
  }

  private async getRequestForSender(
    tx: PrismaTx,
    senderUserId: string,
    requestId: string,
  ) {
    const request = await tx.friendshipRequest.findFirst({
      where: {
        id: requestId,
        senderUserId,
      },
      select: {
        id: true,
        senderUserId: true,
        receiverUserId: true,
        status: true,
      },
    });
    if (!request) {
      throw new NotFoundException('Friend request not found');
    }
    return request;
  }

  private normalizeFriendPair(userAId: string, userBId: string): [string, string] {
    return userAId < userBId ? [userAId, userBId] : [userBId, userAId];
  }

  private async stopAliveMonitoringRelations(
    tx: PrismaTx,
    userAId: string,
    userBId: string,
  ): Promise<void> {
    // block 発生時: userA ↔ userB 間の pending / active 見守り関係を stopped に移行する。
    // トランザクション内で呼ばれるため、呼び出し元と同一アトミック単位で処理される。
    const now = new Date();
    await tx.monitoringRelationship.updateMany({
      where: {
        status: {
          in: [
            MonitoringRelationshipStatus.pending,
            MonitoringRelationshipStatus.active,
          ],
        },
        OR: [
          { watcherUserId: userAId, targetUserId: userBId },
          { watcherUserId: userBId, targetUserId: userAId },
        ],
      },
      data: {
        status: MonitoringRelationshipStatus.stopped,
        stoppedAt: now,
      },
    });
  }

  private async createFriendInviteLink(
    tx: PrismaTx,
    createdByUserId: string,
    inviterDisplayName: string,
  ): Promise<FriendInviteLinkResult> {
    try {
      const createdAt = new Date();
      const invite = await tx.friendInviteLink.create({
        data: {
          createdByUserId,
          token: this.generateInviteToken(),
          expiresAt: new Date(createdAt.getTime() + FRIEND_INVITE_TTL_MS),
        },
      });

      return this.toFriendInviteLinkResult(invite, inviterDisplayName);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('An active friend invite link already exists');
      }
      throw err;
    }
  }

  private generateInviteToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private toFriendInviteLinkResult(
    invite: {
      token: string;
      expiresAt: Date;
    },
    inviterDisplayName: string,
  ): FriendInviteLinkResult {
    const invitePath = `/friend-invites/${invite.token}`;
    const inviteUrl = `kyoiru://friend-invites/${invite.token}`;
    const shareText = this.buildFriendInviteShareText(inviterDisplayName, inviteUrl);

    return {
      token: invite.token,
      invitePath,
      inviteUrl,
      expiresAt: invite.expiresAt,
      shareText,
      lineShareUrl: `https://line.me/R/share?text=${encodeURIComponent(shareText)}`,
    };
  }

  private buildFriendInviteShareText(
    inviterDisplayName: string,
    inviteUrl: string,
  ): string {
    const inviterName = inviterDisplayName.trim() || 'Kyoiruユーザー';
    return `${inviterName}さんから Kyoiru の友達追加リンクが届いています。\n${inviteUrl}`;
  }

  private async getFriendInviteByToken(token: string, tx?: PrismaTx) {
    const client = tx ?? this.prisma;
    const invite = await client.friendInviteLink.findUnique({
      where: { token },
      select: {
        id: true,
        createdByUserId: true,
        token: true,
        expiresAt: true,
        usedAt: true,
        revokedAt: true,
        createdBy: {
          select: {
            id: true,
            userId: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!invite) {
      throw new NotFoundException('Friend invite not found');
    }

    return invite;
  }

  private isFriendInviteJoinable(
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

  private async canAcceptFriendInvite(
    currentUser: User,
    invite: Awaited<ReturnType<FriendsService['getFriendInviteByToken']>>,
  ): Promise<boolean> {
    if (!this.isFriendInviteJoinable(invite, new Date())) {
      return false;
    }

    if (invite.createdBy.id === currentUser.id) {
      return false;
    }

    const [blockRelation, friendship] = await Promise.all([
      this.findBlockRelationBetweenUsers(
        this.prisma,
        currentUser.id,
        invite.createdBy.id,
      ),
      this.getFriendship(this.prisma, currentUser.id, invite.createdBy.id),
    ]);

    return !blockRelation && !friendship;
  }

  private getFriendship(
    client: Pick<PrismaTx, 'friendship'> | Pick<PrismaService, 'friendship'>,
    userAId: string,
    userBId: string,
  ) {
    const [userLowId, userHighId] = this.normalizeFriendPair(userAId, userBId);

    return client.friendship.findUnique({
      where: {
        uq_friendships_pair: { userLowId, userHighId },
      },
      select: { id: true },
    });
  }

  private findBlockRelationBetweenUsers(
    client: Pick<PrismaTx, 'userBlock'> | Pick<PrismaService, 'userBlock'>,
    userAId: string,
    userBId: string,
  ) {
    return client.userBlock.findFirst({
      where: {
        OR: [
          { blockerUserId: userAId, blockedUserId: userBId },
          { blockerUserId: userBId, blockedUserId: userAId },
        ],
      },
      select: { id: true },
    });
  }
}
