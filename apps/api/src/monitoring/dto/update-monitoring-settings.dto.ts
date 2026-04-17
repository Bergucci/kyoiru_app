import { IsEnum } from 'class-validator';
import { GpsShareMode } from '@prisma/client';

export class UpdateMonitoringSettingsDto {
  /**
   * GPS 共有モード
   * off        = 共有しない
   * on_overdue = 未反応時のみ参照可能
   * always     = 常時共有
   */
  @IsEnum(GpsShareMode)
  gpsShareMode!: GpsShareMode;
}
