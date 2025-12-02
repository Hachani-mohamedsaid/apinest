import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsBoolean } from 'class-validator';
import { CreateWhiteLabelDto } from './create-white-label.dto';

export class UpdateWhiteLabelDto extends PartialType(CreateWhiteLabelDto) {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

