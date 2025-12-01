import { IsString } from 'class-validator';

export class ApplyPromoCodeDto {
  @IsString()
  code: string;
}

