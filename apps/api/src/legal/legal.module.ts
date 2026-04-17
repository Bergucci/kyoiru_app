import { Module } from '@nestjs/common';
import { LegalController } from './legal.controller.js';
import { LegalConfigService } from './legal-config.service.js';

@Module({
  controllers: [LegalController],
  providers: [LegalConfigService],
  exports: [LegalConfigService],
})
export class LegalModule {}
