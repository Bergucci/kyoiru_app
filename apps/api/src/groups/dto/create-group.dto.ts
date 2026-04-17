import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { GroupType } from '@prisma/client';

export class CreateGroupDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string;

  @IsEnum(GroupType)
  type!: GroupType;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  iconUrl?: string;

  /**
   * 公開 userId を指定する。
   * 自分自身は含めず、友達だけを渡す。
   */
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  initialMemberUserIds?: string[];
}
