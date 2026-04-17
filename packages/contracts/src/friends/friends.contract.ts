// ─────────────────────────────────────────────
// 友達 API 契約 (Step 4 で実装)
// ─────────────────────────────────────────────
import type { PaginationQuery, PaginatedResponse } from '../shared/pagination';

// --- enums ---

export const FriendRequestStatus = {
  Pending: 'pending',
  Accepted: 'accepted',
  Rejected: 'rejected',
  Cancelled: 'cancelled',
} as const;
export type FriendRequestStatus =
  (typeof FriendRequestStatus)[keyof typeof FriendRequestStatus];

export const RelationshipStatus = {
  None: 'none',
  Requested: 'requested',    // 自分が送信済み
  Received: 'received',      // 相手から受信済み
  Friends: 'friends',
  Blocked: 'blocked',        // 自分が block している
  BlockedBy: 'blocked_by',   // 相手に block されている
} as const;
export type RelationshipStatus =
  (typeof RelationshipStatus)[keyof typeof RelationshipStatus];

// --- request ---

export interface SendFriendRequestRequest {
  targetUserId: string;
}

export interface RespondFriendRequestRequest {
  accept: boolean;
}

export interface FriendsListQuery extends PaginationQuery {}

// --- response ---

export interface FriendSummary {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  relationship: RelationshipStatus;
}

export interface FriendsListResponse extends PaginatedResponse<FriendSummary> {}

export interface FriendRequestSummary {
  requestId: string;
  fromUser: Pick<FriendSummary, 'userId' | 'displayName' | 'avatarUrl'>;
  status: FriendRequestStatus;
  createdAt: string; // ISO 8601
}
