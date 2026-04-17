import { IdSearchVisibility } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateAccountSettingsDto {
  @IsString()
  @IsOptional()
  userId?: string;

  @IsEnum(IdSearchVisibility)
  @IsOptional()
  idSearchVisibility?: IdSearchVisibility;
}
