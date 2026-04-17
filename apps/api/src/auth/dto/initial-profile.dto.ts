import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class InitialProfileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  displayName!: string;

  /** avatarUrl は文字列保持のみ。ファイルアップロード基盤は後続 Step で対応 */
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(30)
  userId!: string;
}
