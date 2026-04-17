import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { decode, verify, type JwtPayload, type VerifyErrors } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

/**
 * Apple identityToken (JWT) を Apple 公開鍵で検証し、sub を返す。
 *
 * モバイル: expo-apple-authentication → identityToken
 * 検証手順:
 *   1. JWT ヘッダーから kid を取得
 *   2. Apple JWKS から対応する公開鍵を取得 (キャッシュあり)
 *   3. jsonwebtoken で署名 / iss / aud / exp を検証
 *   4. payload.sub を providerSubject として返す
 *
 * 環境変数: APPLE_CLIENT_ID
 *   iOS アプリの Bundle ID (例: com.example.kyoiru)
 *   取得先: Apple Developer Console > Identifiers
 */
@Injectable()
export class AppleVerifyService {
  private readonly clientId: string;
  private readonly client = jwksClient({
    jwksUri: 'https://appleid.apple.com/auth/keys',
    cache: true,
    cacheMaxAge: 10 * 60 * 1000, // 10 分
  });

  constructor(configService: ConfigService) {
    this.clientId = configService.getOrThrow<string>('APPLE_CLIENT_ID');
  }

  async verify(identityToken: string): Promise<string> {
    const decoded = decode(identityToken, { complete: true });
    if (!decoded || typeof decoded.header !== 'object' || !decoded.header.kid) {
      throw new UnauthorizedException('Invalid Apple token format');
    }

    let publicKey: string;
    try {
      const key = await this.client.getSigningKey(decoded.header.kid);
      publicKey = key.getPublicKey();
    } catch {
      throw new UnauthorizedException('Failed to fetch Apple signing key');
    }

    const payload = await this.verifyJwt(identityToken, publicKey, {
      issuer: 'https://appleid.apple.com',
      audience: this.clientId,
    });

    if (!payload.sub) {
      throw new UnauthorizedException('Apple token: missing sub');
    }

    return payload.sub;
  }

  private verifyJwt(
    token: string,
    key: string,
    options: { issuer: string; audience: string },
  ): Promise<JwtPayload> {
    return new Promise((resolve, reject) => {
      verify(
        token,
        key,
        { ...options, algorithms: ['RS256'] },
        (err: VerifyErrors | null, decoded: JwtPayload | string | undefined) => {
          if (err) reject(new UnauthorizedException('Invalid Apple identity token'));
          else resolve(decoded as JwtPayload);
        },
      );
    });
  }
}
