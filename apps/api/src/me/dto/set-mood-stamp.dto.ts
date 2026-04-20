import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { MOOD_STAMP_VALUES } from '../me.utils.js';

export class SetMoodStampDto {
  @IsIn(MOOD_STAMP_VALUES)
  mood!: (typeof MOOD_STAMP_VALUES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  note?: string;
}
