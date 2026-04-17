import { Module } from '@nestjs/common';
import { AccountController } from './account.controller.js';
import { AccountDeletionScheduler } from './account-deletion.scheduler.js';
import { AccountService } from './account.service.js';
import { AccountDeletionSchedulerService } from './account-deletion-scheduler.service.js';
import { AccountDeletionJob } from './account-deletion.job.js';
import { PushTokenService } from './push-token.service.js';

@Module({
  controllers: [AccountController],
  providers: [
    AccountService,
    AccountDeletionScheduler,
    AccountDeletionSchedulerService,
    AccountDeletionJob,
    PushTokenService,
  ],
  exports: [
    AccountService,
    AccountDeletionScheduler,
    AccountDeletionSchedulerService,
    AccountDeletionJob,
  ],
})
export class AccountModule {}
