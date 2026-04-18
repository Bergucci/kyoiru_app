import { useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import LineLogin, { Scope } from '@xmartlabs/react-native-line';
import { apiRequest } from './api';
import type { SessionState } from '../session/session-context';

WebBrowser.maybeCompleteAuthSession();

export type SocialProvider = 'apple' | 'google' | 'line';

interface SocialProviderMeta {
  label: string;
  credentialField: 'identityToken' | 'idToken' | 'accessToken';
}

export const socialProviders: Record<SocialProvider, SocialProviderMeta> = {
  apple: { label: 'Apple', credentialField: 'identityToken' },
  google: { label: 'Google', credentialField: 'idToken' },
  line: { label: 'LINE', credentialField: 'accessToken' },
};

export class SocialLoginUnavailableError extends Error {
  constructor(public readonly provider: SocialProvider, message?: string) {
    super(
      message ?? `${socialProviders[provider].label} ログインは現在利用できません。`,
    );
    this.name = 'SocialLoginUnavailableError';
  }
}

export class SocialLoginCancelledError extends Error {
  constructor(public readonly provider: SocialProvider) {
    super(`${socialProviders[provider].label} ログインをキャンセルしました。`);
    this.name = 'SocialLoginCancelledError';
  }
}

async function exchangeCredential(
  provider: SocialProvider,
  credential: string,
): Promise<SessionState> {
  const meta = socialProviders[provider];
  return apiRequest<SessionState>(`/auth/${provider}`, {
    method: 'POST',
    body: {
      [meta.credentialField]: credential,
    },
  });
}

async function acquireAppleIdentityToken(): Promise<string> {
  if (Platform.OS !== 'ios') {
    throw new SocialLoginUnavailableError(
      'apple',
      'Apple ログインは iOS デバイスでのみ利用できます。',
    );
  }

  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) {
    throw new SocialLoginUnavailableError(
      'apple',
      'このデバイスでは Apple ログインを利用できません。',
    );
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error('Apple identityToken を取得できませんでした。');
    }

    return credential.identityToken;
  } catch (error) {
    if (isAppleCancelError(error)) {
      throw new SocialLoginCancelledError('apple');
    }
    throw error;
  }
}

function isAppleCancelError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const code = (error as { code?: string }).code;
  return code === 'ERR_REQUEST_CANCELED' || code === 'ERR_CANCELED';
}

function isLineCancelError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string };
  const code = e.code ?? '';
  const message = (e.message ?? '').toLowerCase();
  return (
    code === 'LINE_SDK_ERROR_USER_CANCEL' ||
    message.includes('cancel') ||
    message.includes('dismiss')
  );
}

export interface SocialLoginController {
  loginWithApple: () => Promise<SessionState>;
  loginWithGoogle: () => Promise<SessionState>;
  loginWithLine: () => Promise<SessionState>;
  isAppleAvailable: boolean;
  isGoogleConfigured: boolean;
  isLineConfigured: boolean;
}

export function useSocialLoginController(): SocialLoginController {
  const googleClientIds = useMemo(
    () => ({
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
      androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
    }),
    [],
  );

  const isGoogleConfigured = Boolean(
    googleClientIds.iosClientId ||
      googleClientIds.androidClientId ||
      googleClientIds.webClientId,
  );

  const [, , promptGoogleAsync] = Google.useAuthRequest({
    iosClientId: googleClientIds.iosClientId,
    androidClientId: googleClientIds.androidClientId,
    webClientId: googleClientIds.webClientId,
    scopes: ['openid', 'profile', 'email'],
  });

  const lineChannelId = process.env.EXPO_PUBLIC_LINE_CHANNEL_ID;
  const isLineConfigured = Boolean(lineChannelId);

  const loginWithApple = useCallback(async () => {
    const identityToken = await acquireAppleIdentityToken();
    return exchangeCredential('apple', identityToken);
  }, []);

  const loginWithGoogle = useCallback(async () => {
    if (!isGoogleConfigured) {
      throw new SocialLoginUnavailableError(
        'google',
        'Google クライアント ID が設定されていません。',
      );
    }

    const result = await promptGoogleAsync();

    if (result.type === 'cancel' || result.type === 'dismiss') {
      throw new SocialLoginCancelledError('google');
    }

    if (result.type !== 'success') {
      throw new Error('Google 認証に失敗しました。');
    }

    const idToken =
      result.authentication?.idToken ??
      (result.params?.id_token as string | undefined);

    if (!idToken) {
      throw new Error('Google idToken を取得できませんでした。');
    }

    return exchangeCredential('google', idToken);
  }, [isGoogleConfigured, promptGoogleAsync]);

  const loginWithLine = useCallback(async () => {
    if (!isLineConfigured || !lineChannelId) {
      throw new SocialLoginUnavailableError(
        'line',
        'LINE チャネル ID が設定されていません。',
      );
    }

    // [LINE DEBUG] channel ID の設定確認
    console.log('[LINE] setup channelId length:', lineChannelId.length, '| prefix:', lineChannelId.slice(0, 4));

    await LineLogin.setup({ channelId: lineChannelId });

    try {
      const result = await LineLogin.login({ scopes: [Scope.Profile, Scope.OpenId] });

      // [LINE DEBUG] SDK から返ってきた result 全体の key 一覧
      console.log('[LINE] login result keys:', Object.keys(result));
      console.log('[LINE] accessToken object keys:', Object.keys(result.accessToken));

      const accessToken = result.accessToken.accessToken;

      // [LINE DEBUG] token の存在と内容を確認（全文は出さない）
      console.log('[LINE] accessToken type:', typeof accessToken);
      console.log('[LINE] accessToken length:', accessToken?.length ?? 'undefined');
      console.log('[LINE] accessToken prefix:', typeof accessToken === 'string' ? accessToken.slice(0, 8) : 'N/A');

      if (!accessToken) {
        throw new Error('LINE accessToken を取得できませんでした。');
      }

      // [LINE DEBUG] backend に送る payload を確認
      console.log('[LINE] sending to /auth/line, body key: accessToken, length:', accessToken.length);

      return exchangeCredential('line', accessToken);
    } catch (error) {
      // [LINE DEBUG] SDK / API エラーの全詳細
      console.log('[LINE] error caught:', JSON.stringify(error, Object.getOwnPropertyNames(error as object)));
      if (isLineCancelError(error)) {
        throw new SocialLoginCancelledError('line');
      }
      throw error;
    }
  }, [isLineConfigured, lineChannelId]);

  return {
    loginWithApple,
    loginWithGoogle,
    loginWithLine,
    isAppleAvailable: Platform.OS === 'ios',
    isGoogleConfigured,
    isLineConfigured,
  };
}
