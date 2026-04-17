import { IsUUID } from 'class-validator';

export class GroupIdParamDto {
  @IsUUID()
  groupId!: string;
}
