// ─────────────────────────────────────────────
// 友達申請の制約判定 (純粋関数)
//
// 仕様に明記された制約のみを扱う:
//   - block 優先 (情報漏洩防止のため他の理由を隠す)
//   - already_friends
//   - already_pending
//
// 扱わないもの (service 層で処理):
//   - 1 日 30 件制限 (時刻依存・DB 参照が必要)
//   - 拒否後 30 日再申請不可 (時刻依存・DB 参照が必要)
//   - 友達数上限 (仕様未確定)
// ─────────────────────────────────────────────

export interface FriendConstraintInput {
  /** 申請先が自分を block しているか */
  targetBlocksMe: boolean;
  /** 自分が申請先を block しているか */
  iBlockTarget: boolean;
  /** 既に友達か */
  alreadyFriends: boolean;
  /** 既に pending リクエストが存在するか */
  alreadyPending: boolean;
}

export type FriendConstraintViolation =
  | 'blocked'         // block 関係がある (どちら方向でも)
  | 'already_friends'
  | 'already_pending';

/**
 * 友達申請が可能かを判定し、不可の場合は違反理由を返す。
 * block が存在する場合は他の理由を返さない (情報漏洩防止)。
 */
export function checkFriendRequestConstraints(
  input: FriendConstraintInput,
): FriendConstraintViolation | null {
  if (input.targetBlocksMe || input.iBlockTarget) {
    return 'blocked';
  }
  if (input.alreadyFriends) return 'already_friends';
  if (input.alreadyPending) return 'already_pending';
  return null;
}
