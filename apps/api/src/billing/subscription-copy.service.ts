import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LegalConfigService } from '../legal/legal-config.service.js';

@Injectable()
export class SubscriptionCopyService {
  constructor(
    private readonly configService: ConfigService,
    private readonly legalConfigService: LegalConfigService,
  ) {}

  getSubscriptionCopy() {
    const legalLinks = this.legalConfigService.getLegalLinks();

    return {
      planName: this.configService.get<string>(
        'REVENUECAT_MONITORING_PLAN_NAME',
        '見守りプラン',
      ),
      priceDisplay: '月額 980 円',
      billingCycle: '月額',
      freeTrial: '7 日間無料トライアル',
      autoRenew: '自動更新',
      cancellationMethod:
        '解約は App Store または Google Play の定期購入設定から行えます。',
      termsOfServiceUrl: legalLinks.termsOfServiceUrl,
      privacyPolicyUrl: legalLinks.privacyPolicyUrl,
      reviewSummary:
        '見守りやすくし、反応がない時に確認しやすくするための有料機能です。',
    };
  }
}
