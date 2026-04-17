import { IsIn } from 'class-validator';
import { MOOD_STAMP_VALUES } from '../me.utils.js';

export class SetMoodStampDto {
  @IsIn(MOOD_STAMP_VALUES)
  mood!: (typeof MOOD_STAMP_VALUES)[number];
}
