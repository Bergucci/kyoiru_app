import { IsNotEmpty, IsString } from 'class-validator';

export class StartMonitoringRequestDto {
  /**
   * 見守り対象ユーザーの公開 userId (@kyoiru123 相当の文字列)
   * 検索結果に含まれる userId をそのまま渡す
   */
  @IsString()
  @IsNotEmpty()
  targetUserId!: string;
}
