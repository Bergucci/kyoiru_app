import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendContactDto {
  @IsString()
  @IsNotEmpty({ message: 'お名前を入力してください' })
  @MaxLength(100)
  name!: string;

  @IsEmail({}, { message: '有効なメールアドレスを入力してください' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'お問い合わせ種別を選択してください' })
  @MaxLength(100)
  category!: string;

  @IsString()
  @IsNotEmpty({ message: 'お問い合わせ内容を入力してください' })
  @MaxLength(3000, { message: 'お問い合わせ内容は3000文字以内で入力してください' })
  message!: string;
}
