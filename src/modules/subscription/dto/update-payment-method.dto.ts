import { IsString } from 'class-validator';

export class UpdatePaymentMethodDto {
  @IsString()
  paymentMethodId: string;
}

