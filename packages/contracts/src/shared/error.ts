// ─────────────────────────────────────────────
// API エラーレスポンス共通契約
// ─────────────────────────────────────────────

export interface ApiErrorResponse {
  code: string;
  message: string;
}
