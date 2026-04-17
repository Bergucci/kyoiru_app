import { IsUUID } from 'class-validator';

export class MonitoringIdParamDto {
  @IsUUID()
  id!: string;
}
