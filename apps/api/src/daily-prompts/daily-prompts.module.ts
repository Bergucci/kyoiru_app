import { Module } from '@nestjs/common';
import { DailyPromptsController } from './daily-prompts.controller.js';
import { DailyPromptsService } from './daily-prompts.service.js';

@Module({
  controllers: [DailyPromptsController],
  providers: [DailyPromptsService],
})
export class DailyPromptsModule {}
