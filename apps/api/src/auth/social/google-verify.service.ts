import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { decode, verify, type JwtPayload, type VerifyErrors } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

/**
 * Google idToken (JWT) を Google 公開鍵で検証し、sub を返す。
 *
 * モバイル: @react-native-google-signin/google-signin → idToken
 * 検証手順:
 *   1. JWT ヘッダーから kid を取得
 *   2. Google JWKS から対応する公開鍵を取得 (キャッシュあり)
 *   3. jsonwebtoken で署名 / iss / aud / exp を検証
 *   4. payload.sub を providerSubject として返す
 *
 * 環境変数: GOOGLE_CLIENT_ID
 *   iOS / Android 共通の OAuth 2.0 クライアント ID
 *   取得先: Google Cloud Console > APIs & Services > Credentials
 */
@Injectable()
export class GoogleVerifyService {
  private readonly clientId: string;
  private readonly client = jwksClient({
    jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
    cache: true,
    cacheMaxAge: 10 * 60 * 1000, // 10 分
  });

  constructor(configService: ConfigService) {
    this.clientId = configService.getOrThrow<string>('GOOGLE_CLIENT_ID');
  }

  async verify(idToken: string): Promise<string> {
    const decoded = decode(idToken, { complete: true });
    if (!decoded || typeof decoded.header !== 'object' || !decoded.header.kid) {
      throw new UnauthorizedException('Invalid Google token format');
    }

    let publicKey: string;
    try {
      const key = await this.client.getSigningKey(decoded.header.kid);
      publicKey = key.getPublicKey();
    } catch {
      throw new UnauthorizedException('Failed to fetch Google signing key');
    }

    const payload = await this.verifyJwt(idToken, publicKey, {
      // Google は両表記を使う。tuple 型で渡す
      issuer: ['https://accounts.google.com', 'accounts.google.com'] as [string, ...string[]],
      audience: this.clientId,
    });

    if (!payload.sub) {
      throw new UnauthorizedException('Google token: missing sub');
    }

    return payload.sub;
  }

  private verifyJwt(
    token: string,
    key: string,
    options: { issuer: [string, ...string[]]; audience: string },
  ): Promise<JwtPayload> {
    return new Promise((resolve, reject) => {
      verify(
        token,
        key,
        { ...options, algorithms: ['RS256'] },
        (err: VerifyErrors | null, decoded: JwtPayload | string | undefined) => {
          if (err) reject(new UnauthorizedException('Invalid Google ID token'));
          else resolve(decoded as JwtPayload);
        },
      );
    });
  }
}
