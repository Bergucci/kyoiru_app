import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const LINE_VERIFY_URL = 'https://api.line.me/oauth2/v2.1/verify';
const LINE_PROFILE_URL = 'https://api.line.me/v2/profile';

interface LineVerifyResponse {
  /** token を発行した LINE channel の ID */
  client_id: string;
  scope: string;
  expires_in: number;
}

interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

/**
 * LINE accessToken を 2 段階で検証し、userId を返す。
 *
 * モバイル: LINE SDK → accessToken
 *
 * 検証手順:
 *   1. LINE verify endpoint で token 情報を取得
 *   2. client_id が Kyoiru の LINE_CHANNEL_ID と一致するか確認
 *      → 不一致なら Unauthorized (他 channel 向け token を弾く)
 *   3. /v2/profile で userId を取得
 *
 * 環境変数: LINE_CHANNEL_ID
 *   Kyoiru 用 LINE Login channel の channel ID
 *   取得先: LINE Developers Console > Providers > Channel > Channel ID
 */
@Injectable()
export class LineVerifyService {
  private readonly channelId: string;

  constructor(configService: ConfigService) {
    this.channelId = configService.getOrThrow<string>('LINE_CHANNEL_ID');
  }

  async verify(accessToken: string): Promise<string> {
    // ── Step 1: token の発行先 channel を確認 ─────────────────
    const verifyRes = await this.fetchJson<LineVerifyResponse>(
      `${LINE_VERIFY_URL}?access_token=${encodeURIComponent(accessToken)}`,
      'LINE verify request failed',
    );

    if (verifyRes.client_id !== this.channelId) {
      throw new UnauthorizedException('LINE token was not issued for this channel');
    }

    // ── Step 2: userId を取得 ─────────────────────────────────
    const profile = await this.fetchJson<LineProfile>(
      LINE_PROFILE_URL,
      'LINE profile request failed',
      { Authorization: `Bearer ${accessToken}` },
    );

    if (!profile.userId) {
      throw new UnauthorizedException('LINE profile: missing userId');
    }

    return profile.userId;
  }

  private async fetchJson<T>(
    url: string,
    errorMessage: string,
    headers?: Record<string, string>,
  ): Promise<T> {
    let res: Response;
    try {
      res = await fetch(url, { headers });
    } catch {
      throw new UnauthorizedException(errorMessage);
    }

    if (!res.ok) {
      throw new UnauthorizedException(errorMessage);
    }

    return res.json() as Promise<T>;
  }
}
