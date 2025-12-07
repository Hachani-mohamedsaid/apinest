import { IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWithdrawDto {
  @ApiProperty({ example: 350.0, description: 'Amount to withdraw in USD' })
  @IsNumber()
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount: number;

  @ApiPropertyOptional({ example: 'FR76 1234 5678 9012 3456 7890 123', description: 'Bank account number' })
  @IsString()
  @IsOptional()
  bankAccount?: string;

  @ApiPropertyOptional({ example: 'bank_transfer', description: 'Payment method (bank_transfer, paypal, etc.)' })
  @IsString()
  @IsOptional()
  @Max(50)
  paymentMethod?: string;

  @ApiPropertyOptional({ example: 'usd', description: 'Currency (usd, eur, etc.)' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ example: 'Withdrawal for December earnings', description: 'Optional description' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class WithdrawResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Withdrawal request submitted successfully' })
  message: string;

  @ApiPropertyOptional({ example: 'WDR-A1B2C3D4' })
  withdrawId?: string;

  @ApiPropertyOptional({ example: 350.0 })
  amount?: number;

  @ApiPropertyOptional({ example: 'pending' })
  status?: string;

  @ApiPropertyOptional()
  data?: any;
}

