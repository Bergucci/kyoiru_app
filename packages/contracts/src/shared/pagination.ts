// ─────────────────────────────────────────────
// 汎用ページネーション契約
// ─────────────────────────────────────────────

export interface PaginationQuery {
  /** 取得件数 (デフォルト 20, 最大 100) */
  limit?: number;
  /** カーソル (前回レスポンスの nextCursor を渡す) */
  cursor?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  /** 次ページが存在する場合に設定 */
  nextCursor: string | null;
}
