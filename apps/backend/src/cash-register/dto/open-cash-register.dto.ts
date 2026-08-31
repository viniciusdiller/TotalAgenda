import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class OpenCashRegisterDto {
  @IsInt()
  @Min(0)
  openingFloatCents!: number;

  @IsOptional()
  @IsString()
  note?: string;
}
