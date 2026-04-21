import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { decode, verify, type JwtPayload, type VerifyErrors } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

/**
 * LINE ID トークン（OIDC）を LINE 公開鍵で検証し、sub を返す。
 *
 * モバイル: @xmartlabs/react-native-line → result.accessToken.idToken
 * 検証手順:
 *   1. JWT ヘッダーから kid を取得
 *   2. LINE JWKS から対応する公開鍵を取得 (キャッシュあり)
 *   3. jsonwebtoken で署名 / iss / aud / exp を検証 (ES256 または RS256)
 *   4. payload.sub を providerSubject として返す
 *
 * 環境変数: LINE_CHANNEL_ID
 *   Kyoiru 用 LINE Login channel の channel ID (= JWT の aud クレーム)
 *   取得先: LINE Developers Console > Providers > Channel > Channel ID
 */
@Injectable()
export class LineVerifyService {
  private readonly channelId: string;
  private readonly client = jwksClient({
    jwksUri: 'https://api.line.me/oauth2/v2.1/certs',
    cache: true,
    cacheMaxAge: 10 * 60 * 1000, // 10 分
  });

  constructor(configService: ConfigService) {
    this.channelId = configService.getOrThrow<string>('LINE_CHANNEL_ID');
  }

  async verify(idToken: string): Promise<string> {
    const decoded = decode(idToken, { complete: true });
    if (!decoded || typeof decoded.header !== 'object' || !decoded.header.kid) {
      throw new UnauthorizedException('Invalid LINE token format');
    }

    let publicKey: string;
    try {
      const key = await this.client.getSigningKey(decoded.header.kid);
      publicKey = key.getPublicKey();
    } catch {
      throw new UnauthorizedException('Failed to fetch LINE signing key');
    }

    const payload = await this.verifyJwt(idToken, publicKey, {
      issuer: 'https://access.line.me',
      audience: this.channelId,
    });

    if (!payload.sub) {
      throw new UnauthorizedException('LINE token: missing sub');
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
        { ...options, algorithms: ['ES256', 'RS256'] },
        (err: VerifyErrors | null, decoded: JwtPayload | string | undefined) => {
          if (err) reject(new UnauthorizedException('Invalid LINE identity token'));
          else resolve(decoded as JwtPayload);
        },
      );
    });
  }
}
