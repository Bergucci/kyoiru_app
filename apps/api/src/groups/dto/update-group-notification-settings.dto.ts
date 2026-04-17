import { GroupNotificationLevel } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateGroupNotificationSettingsDto {
  @IsEnum(GroupNotificationLevel)
  notificationLevel!: GroupNotificationLevel;
}
