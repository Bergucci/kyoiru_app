import { Module } from '@nestjs/common';
import { GroupInvitesController } from './group-invites.controller.js';
import { GroupsController } from './groups.controller.js';
import { GroupsService } from './groups.service.js';

@Module({
  controllers: [GroupsController, GroupInvitesController],
  providers: [GroupsService],
})
export class GroupsModule {}
