import { IsUUID } from 'class-validator';

export class BlockIdParamDto {
  @IsUUID()
  blockId!: string;
}
