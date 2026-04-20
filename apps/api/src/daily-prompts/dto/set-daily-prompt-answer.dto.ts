import { IsString, MaxLength, MinLength } from 'class-validator';

export class SetDailyPromptAnswerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  choiceKey!: string;
}
