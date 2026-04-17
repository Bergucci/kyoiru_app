import { IsNotEmpty, IsString } from 'class-validator';

export class AppleLoginDto {
  /** Apple Sign In が返す identityToken (JWT) */
  @IsString()
  @IsNotEmpty()
  identityToken!: string;
}
