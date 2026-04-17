import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateEmergencyContactDto {
  /** 緊急連絡先氏名 (必須) */
  @IsString()
  @IsNotEmpty()
  name!: string;

  /** 電話番号 (必須) */
  @IsString()
  @IsNotEmpty()
  phoneNumber!: string;

  /** 続柄 (任意) */
  @IsString()
  @IsOptional()
  relationship?: string;
}
