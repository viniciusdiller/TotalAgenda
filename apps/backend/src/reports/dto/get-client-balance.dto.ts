import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsUUID, Max, Min } from 'class-validator';

export class GetClientBalanceQueryDto {
  @IsNotEmpty()
  @IsUUID()
  clientId!: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  year!: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;
}
