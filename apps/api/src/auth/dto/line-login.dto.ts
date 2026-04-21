import { IsNotEmpty, IsString } from 'class-validator';

export class LineLoginDto {
  /** LINE SDK が返す OIDC ID トークン */
  @IsString()
  @IsNotEmpty()
  idToken!: string;
}
