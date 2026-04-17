import { IsNotEmpty, IsString } from 'class-validator';

export class LineLoginDto {
  /** LINE SDK が返す accessToken */
  @IsString()
  @IsNotEmpty()
  accessToken!: string;
}
