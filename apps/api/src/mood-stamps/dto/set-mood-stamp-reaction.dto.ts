import { MoodStampReactionType } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class SetMoodStampReactionDto {
  @IsEnum(MoodStampReactionType)
  reactionType!: MoodStampReactionType;
}
