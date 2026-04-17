// ─────────────────────────────────────────────────────────────────────────────
// @kyoiru/contracts
//
// 責務: API 境界の型契約を apps/api と apps/mobile に提供する
//
// 含めるもの:
//   - API request / response 型
//   - 共有 enum / literal union
//   - DTO 相当の共有型
//   - ページネーション等の汎用契約
//
// 含めないもの:
//   - React component / hook
//   - Expo / Native API
//   - NestJS decorator
//   - Prisma / DB アクセス
//   - 業務状態遷移ロジック (→ domain へ)
//   - 画面用整形ロジック (→ apps/mobile へ)
//
// 依存:
//   - 外部ライブラリへの依存なし (pure TypeScript types のみ)
//   - domain には依存しない
// ─────────────────────────────────────────────────────────────────────────────

// shared
export type { PaginationQuery, PaginatedResponse } from './shared/pagination';
export type { ApiErrorResponse } from './shared/error';

// auth
export { AuthProvider } from './auth/auth.contract';
export type {
  SignInRequest,
  SignInResponse,
  MeResponse,
} from './auth/auth.contract';

// friends
export { FriendRequestStatus, RelationshipStatus } from './friends/friends.contract';
export type {
  SendFriendRequestRequest,
  RespondFriendRequestRequest,
  FriendsListQuery,
  FriendSummary,
  FriendsListResponse,
  FriendRequestSummary,
} from './friends/friends.contract';

// groups: Step 5 以降で仕様確定後に追加予定
// GroupRole などは未確定語彙のためエクスポートしない

// watch
export { AlivePhase } from './watch/watch.contract';
export type {
  ReportAliveRequest,
  AliveStatusResponse,
  WatchTargetSummary,
} from './watch/watch.contract';
