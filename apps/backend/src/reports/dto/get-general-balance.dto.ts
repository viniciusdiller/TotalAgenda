import { IsDateString, IsNotEmpty } from 'class-validator';

export class GetGeneralBalanceQueryDto {
  @IsNotEmpty()
  @IsDateString()
  startDate!: string;

  @IsNotEmpty()
  @IsDateString()
  endDate!: string;
}
