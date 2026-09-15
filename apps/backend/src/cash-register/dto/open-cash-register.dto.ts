import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class OpenCashRegisterDto {
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  openingFloatCents!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
