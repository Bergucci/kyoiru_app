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
  credentialField: 'identityToken' | 'idToken';
}

export const socialProviders: Record<SocialProvider, SocialProviderMeta> = {
  apple: { label: 'Apple', credentialField: 'identityToken' },
  google: { label: 'Google', credentialField: 'idToken' },
  line: { label: 'LINE', credentialField: 'idToken' },
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

    await LineLogin.setup({ channelId: lineChannelId });

    try {
      const result = await LineLogin.login({ scopes: [Scope.Profile, Scope.OpenId] });

      const idToken = result.accessToken.idToken;
      if (!idToken) {
        throw new Error('LINE idToken を取得できませんでした。');
      }

      return exchangeCredential('line', idToken);
    } catch (error) {
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
