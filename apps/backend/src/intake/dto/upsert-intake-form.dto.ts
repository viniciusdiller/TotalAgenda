import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from "class-validator";

export const INTAKE_FIELD_TYPES = ["text", "textarea", "boolean", "select"] as const;

export class IntakeFieldDto {
  @IsString()
  @MinLength(1)
  key!: string;

  @IsString()
  @MinLength(1)
  label!: string;

  @IsIn(INTAKE_FIELD_TYPES)
  type!: (typeof INTAKE_FIELD_TYPES)[number];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @IsBoolean()
  required?: boolean;
}

export class UpsertIntakeFormDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => IntakeFieldDto)
  fields!: IntakeFieldDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
