// ─────────────────────────────────────────────
// 認証 API 契約 (Step 3 で実装)
// ─────────────────────────────────────────────

// --- enums ---

export const AuthProvider = {
  Apple: 'apple',
  Google: 'google',
} as const;
export type AuthProvider = (typeof AuthProvider)[keyof typeof AuthProvider];

// --- request ---

export interface SignInRequest {
  provider: AuthProvider;
  /** プロバイダから取得した ID トークン */
  idToken: string;
}

// --- response ---

export interface SignInResponse {
  accessToken: string;
  /** Unix timestamp (秒) */
  expiresAt: number;
}

export interface MeResponse {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}
