import { IsEnum, IsIn, IsInt } from 'class-validator';
import { CheckinTemplate } from '@prisma/client';

export class UpdateCheckinSettingsDto {
  /**
   * 1日のチェックイン回数
   * 1 / 2 / 3 のみ許可
   */
  @IsInt()
  @IsIn([1, 2, 3])
  checkinFrequency!: number;

  /**
   * チェックイン時刻テンプレート
   * morning              = 朝のみ
   * morning_evening      = 朝・夜
   * morning_noon_evening = 朝・昼・夜
   */
  @IsEnum(CheckinTemplate)
  checkinTemplate!: CheckinTemplate;
}
