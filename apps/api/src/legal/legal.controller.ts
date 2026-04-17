import { Controller, Get } from '@nestjs/common';
import { LegalConfigService } from './legal-config.service.js';

@Controller()
export class LegalController {
  constructor(private readonly legalConfigService: LegalConfigService) {}

  @Get('legal-links')
  getLegalLinks() {
    return this.legalConfigService.getLegalLinks();
  }

  @Get('location-permission-copy')
  getLocationPermissionCopy() {
    return this.legalConfigService.getLocationPermissionCopy();
  }
}
