import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LegalConfigService {
  constructor(private readonly configService: ConfigService) {}

  getLegalLinks() {
    return {
      privacyPolicyUrl: this.configService.get<string>(
        'LEGAL_PRIVACY_POLICY_URL',
        'https://example.com/privacy',
      ),
      termsOfServiceUrl: this.configService.get<string>(
        'LEGAL_TERMS_OF_SERVICE_URL',
        'https://example.com/terms',
      ),
      commerceDisclosureUrl: this.configService.get<string>(
        'LEGAL_COMMERCE_DISCLOSURE_URL',
        'https://example.com/legal/commercial-transactions',
      ),
      supportUrl: this.configService.get<string>(
        'LEGAL_SUPPORT_URL',
        'https://example.com/support',
      ),
    };
  }

  getLocationPermissionCopy() {
    return {
      title: '位置情報の利用について',
      purpose:
        '反応がない時に状況確認を補助し、見守りやすくするために使います。',
      consentRequired: true,
      activationRule: '位置情報は明示同意後のみ有効になります。',
      emergencyContactVisibility:
        '緊急連絡先は平常時には表示せず、最終段階でのみ表示します。',
    };
  }
}
