import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";

export const INTAKE_FIELD_TYPES = ["text", "textarea", "boolean", "select"] as const;

export class IntakeFieldDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  key!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label!: string;

  @IsIn(INTAKE_FIELD_TYPES)
  type!: (typeof INTAKE_FIELD_TYPES)[number];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @IsBoolean()
  required?: boolean;
}

export class UpsertIntakeFormDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => IntakeFieldDto)
  fields!: IntakeFieldDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
