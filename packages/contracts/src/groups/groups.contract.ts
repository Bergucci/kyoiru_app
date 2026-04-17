// ─────────────────────────────────────────────
// グループ API 契約 (Step 5 以降で実装)
// ─────────────────────────────────────────────
import type { PaginationQuery, PaginatedResponse } from '../shared/pagination';

// --- enums ---

export const GroupRole = {
  Owner: 'owner',
  Member: 'member',
} as const;
export type GroupRole = (typeof GroupRole)[keyof typeof GroupRole];

// --- request ---

export interface CreateGroupRequest {
  name: string;
}

export interface InviteGroupMemberRequest {
  targetUserId: string;
}

export interface GroupsListQuery extends PaginationQuery {}

// --- response ---

export interface GroupSummary {
  groupId: string;
  name: string;
  memberCount: number;
  myRole: GroupRole;
}

export interface GroupsListResponse extends PaginatedResponse<GroupSummary> {}

export interface GroupMemberSummary {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  role: GroupRole;
}
