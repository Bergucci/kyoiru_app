import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const DEFAULT_SEARCH_RATE_LIMIT = 20;
const DEFAULT_SEARCH_RATE_LIMIT_WINDOW_SECONDS = 60;

@Injectable()
export class FriendsSearchRateLimitService {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly requestLogs = new Map<string, number[]>();

  constructor(private readonly configService: ConfigService) {
    this.maxRequests = this.getPositiveInt(
      'FRIENDS_SEARCH_RATE_LIMIT_MAX',
      DEFAULT_SEARCH_RATE_LIMIT,
    );
    this.windowMs =
      this.getPositiveInt(
        'FRIENDS_SEARCH_RATE_LIMIT_WINDOW_SECONDS',
        DEFAULT_SEARCH_RATE_LIMIT_WINDOW_SECONDS,
      ) * 1000;
  }

  consume(userId: string, now = Date.now()): boolean {
    const windowStart = now - this.windowMs;
    const recentRequests = (this.requestLogs.get(userId) ?? []).filter(
      (timestamp) => timestamp > windowStart,
    );

    if (recentRequests.length >= this.maxRequests) {
      this.requestLogs.set(userId, recentRequests);
      return false;
    }

    recentRequests.push(now);
    this.requestLogs.set(userId, recentRequests);
    return true;
  }

  private getPositiveInt(key: string, fallback: number): number {
    const rawValue = this.configService.get<string>(key);
    if (!rawValue) {
      return fallback;
    }

    const parsedValue = Number.parseInt(rawValue, 10);
    return Number.isFinite(parsedValue) && parsedValue > 0
      ? parsedValue
      : fallback;
  }
}
