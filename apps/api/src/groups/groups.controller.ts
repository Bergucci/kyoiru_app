import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ActiveProfileGuard } from '../auth/guards/active-profile.guard.js';
import { GroupsService } from './groups.service.js';
import { CreateGroupDto } from './dto/create-group.dto.js';
import { GroupIdParamDto } from './dto/group-id-param.dto.js';
import { UpdateGroupNotificationSettingsDto } from './dto/update-group-notification-settings.dto.js';

interface ActiveUserRequest extends FastifyRequest {
  user: User;
}

@Controller('groups')
@UseGuards(JwtAuthGuard, ActiveProfileGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createGroup(
    @Request() req: ActiveUserRequest,
    @Body() dto: CreateGroupDto,
  ) {
    return this.groupsService.createGroup(req.user, dto);
  }

  @Get()
  listGroups(@Request() req: ActiveUserRequest) {
    return this.groupsService.listGroups(req.user);
  }

  @Get(':groupId')
  getGroup(
    @Request() req: ActiveUserRequest,
    @Param() params: GroupIdParamDto,
  ) {
    return this.groupsService.getGroupDetail(req.user, params.groupId);
  }

  @Get(':groupId/notification-settings')
  getNotificationSettings(
    @Request() req: ActiveUserRequest,
    @Param() params: GroupIdParamDto,
  ) {
    return this.groupsService.getNotificationSettings(req.user, params.groupId);
  }

  @Patch(':groupId/notification-settings')
  updateNotificationSettings(
    @Request() req: ActiveUserRequest,
    @Param() params: GroupIdParamDto,
    @Body() dto: UpdateGroupNotificationSettingsDto,
  ) {
    return this.groupsService.updateNotificationSettings(
      req.user,
      params.groupId,
      dto,
    );
  }

  @Post(':groupId/invite-links')
  @HttpCode(HttpStatus.CREATED)
  issueInviteLink(
    @Request() req: ActiveUserRequest,
    @Param() params: GroupIdParamDto,
  ) {
    return this.groupsService.issueInviteLink(req.user, params.groupId);
  }

  @Post(':groupId/invite-links/reissue')
  @HttpCode(HttpStatus.CREATED)
  reissueInviteLink(
    @Request() req: ActiveUserRequest,
    @Param() params: GroupIdParamDto,
  ) {
    return this.groupsService.reissueInviteLink(req.user, params.groupId);
  }
}
