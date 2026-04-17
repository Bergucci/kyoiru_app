import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleLoginDto {
  /** Google Sign In が返す idToken (JWT) */
  @IsString()
  @IsNotEmpty()
  idToken!: string;
}
