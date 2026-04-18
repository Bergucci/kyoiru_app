import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
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
  // [LINE DEBUG]
  private readonly logger = new Logger(LineVerifyService.name);
  private readonly channelId: string;

  constructor(configService: ConfigService) {
    this.channelId = configService.getOrThrow<string>('LINE_CHANNEL_ID');
    // [LINE DEBUG] 起動時に channel ID が読めているか確認
    this.logger.log(`[LINE] LineVerifyService initialized | channelId length: ${this.channelId.length} | prefix: ${this.channelId.slice(0, 4)}`);
  }

  async verify(accessToken: string): Promise<string> {
    // [LINE DEBUG] 受け取った token の確認
    this.logger.log(`[LINE] verify called | token length: ${accessToken?.length ?? 0} | prefix: ${accessToken?.slice(0, 8) ?? 'none'}`);

    // ── Step 1: token の発行先 channel を確認 ─────────────────
    let verifyRes: LineVerifyResponse;
    try {
      verifyRes = await this.fetchJson<LineVerifyResponse>(
        `${LINE_VERIFY_URL}?access_token=${encodeURIComponent(accessToken)}`,
        'LINE verify request failed',
      );
    } catch (e) {
      // [LINE DEBUG] LINE verify endpoint からのエラー詳細
      this.logger.error(`[LINE] verify endpoint failed: ${String(e)}`);
      throw e;
    }

    // [LINE DEBUG] channel ID の照合
    this.logger.log(`[LINE] verify response client_id: ${verifyRes.client_id} | expected: ${this.channelId} | match: ${verifyRes.client_id === this.channelId}`);

    if (verifyRes.client_id !== this.channelId) {
      this.logger.error(`[LINE] channel mismatch → token issued for ${verifyRes.client_id}, expected ${this.channelId}`);
      throw new UnauthorizedException('LINE token was not issued for this channel');
    }

    // ── Step 2: userId を取得 ─────────────────────────────────
    let profile: LineProfile;
    try {
      profile = await this.fetchJson<LineProfile>(
        LINE_PROFILE_URL,
        'LINE profile request failed',
        { Authorization: `Bearer ${accessToken}` },
      );
    } catch (e) {
      // [LINE DEBUG] profile endpoint からのエラー詳細
      this.logger.error(`[LINE] profile endpoint failed: ${String(e)}`);
      throw e;
    }

    // [LINE DEBUG] userId の確認
    this.logger.log(`[LINE] profile userId present: ${Boolean(profile.userId)}`);

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
