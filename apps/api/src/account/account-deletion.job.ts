import { Injectable } from '@nestjs/common';
import { AccountDeletionSchedulerService } from './account-deletion-scheduler.service.js';
import type { AccountDeletionJobResult } from './account.types.js';

@Injectable()
export class AccountDeletionJob {
  constructor(
    private readonly accountDeletionSchedulerService: AccountDeletionSchedulerService,
  ) {}

  async run(now: Date = new Date()): Promise<AccountDeletionJobResult> {
    return this.accountDeletionSchedulerService.runDueTasks(now);
  }
}
