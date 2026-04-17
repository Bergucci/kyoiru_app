// ─────────────────────────────────────────────────────────────────────────────
// @kyoiru/domain
//
// 責務: UI・フレームワーク・DB に依存しない業務ルールを提供する
//
// 含めるもの:
//   - JST 日付ルール (朝 6:00 業務日起点)
//   - 生存報告フェーズの内部表現と遷移判定
//   - 友達申請制約の純粋判定 (仕様記載分のみ)
//
// 含めないもの:
//   - React hook / component
//   - Expo / React Native API
//   - NestJS decorator / provider
//   - Prisma / DB 直接アクセス
//   - HTTP client 実装
//   - 画面遷移ロジック
//   - contracts の型への依存 (循環依存防止)
//   - 仕様未確定の上限値・通知段階 (service 層または後続 Step へ)
//
// 依存:
//   - 外部ライブラリへの依存なし (標準 API + pure TypeScript のみ)
//   - contracts には依存しない
// ─────────────────────────────────────────────────────────────────────────────

// shared
export {
  toJstParts,
  fromJstParts,
  getBusinessDayStartUtc,
  getDeadlineUtc,
  isOverDeadline,
} from './shared/jst';

// alive
export type { InternalAlivePhase, AlivePhaseInput } from './alive/alive-phase';
export { computeAlivePhase } from './alive/alive-phase';

// friends
export type {
  FriendConstraintInput,
  FriendConstraintViolation,
} from './friends/friend-constraints';
export { checkFriendRequestConstraints } from './friends/friend-constraints';
