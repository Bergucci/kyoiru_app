import { useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
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

const LINE_DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://access.line.me/oauth2/v2.1/authorize',
  tokenEndpoint: 'https://api.line.me/oauth2/v2.1/token',
};

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

  const lineRedirectUri = useMemo(
    () =>
      AuthSession.makeRedirectUri({
        scheme: 'kyoiru',
        path: 'auth/line',
      }),
    [],
  );

  const [lineRequest, , promptLineAsync] = AuthSession.useAuthRequest(
    {
      clientId: lineChannelId ?? '',
      scopes: ['openid', 'profile'],
      redirectUri: lineRedirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
    },
    LINE_DISCOVERY,
  );

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

    const result = await promptLineAsync();

    if (result.type === 'cancel' || result.type === 'dismiss') {
      throw new SocialLoginCancelledError('line');
    }

    if (result.type !== 'success') {
      throw new Error('LINE 認証に失敗しました。');
    }

    const code = result.params?.code;
    if (!code) {
      throw new Error('LINE 認証コードを取得できませんでした。');
    }

    const codeVerifier = lineRequest?.codeVerifier;
    if (!codeVerifier) {
      throw new Error('LINE PKCE verifier を取得できませんでした。');
    }

    const tokenResponse = await AuthSession.exchangeCodeAsync(
      {
        clientId: lineChannelId,
        code,
        redirectUri: lineRedirectUri,
        extraParams: {
          code_verifier: codeVerifier,
        },
      },
      LINE_DISCOVERY,
    );

    if (!tokenResponse.accessToken) {
      throw new Error('LINE accessToken を取得できませんでした。');
    }

    return exchangeCredential('line', tokenResponse.accessToken);
  }, [isLineConfigured, lineChannelId, lineRedirectUri, lineRequest, promptLineAsync]);

  return {
    loginWithApple,
    loginWithGoogle,
    loginWithLine,
    isAppleAvailable: Platform.OS === 'ios',
    isGoogleConfigured,
    isLineConfigured,
  };
}
