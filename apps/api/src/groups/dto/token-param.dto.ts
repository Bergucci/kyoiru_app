import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class TokenParamDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  token!: string;
}
