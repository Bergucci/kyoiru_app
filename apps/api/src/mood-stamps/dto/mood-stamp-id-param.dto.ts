import { IsUUID } from 'class-validator';

export class MoodStampIdParamDto {
  @IsUUID()
  moodStampId!: string;
}
