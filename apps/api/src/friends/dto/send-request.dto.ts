import { IsNotEmpty, IsString } from 'class-validator';

export class SendRequestDto {
  /**
   * 申請先ユーザーの公開 userId (UUID ではなく "@kyoiru123" 相当の文字列)
   * 検索結果に含まれる userId をそのまま渡す
   */
  @IsString()
  @IsNotEmpty()
  targetUserId!: string;
}
