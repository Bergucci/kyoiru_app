import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class SearchUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(30)
  userId!: string;
}
