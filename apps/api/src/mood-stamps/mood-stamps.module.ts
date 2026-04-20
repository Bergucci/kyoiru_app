import { Module } from '@nestjs/common';
import { MoodStampsController } from './mood-stamps.controller.js';
import { MoodStampsService } from './mood-stamps.service.js';

@Module({
  controllers: [MoodStampsController],
  providers: [MoodStampsService],
})
export class MoodStampsModule {}
