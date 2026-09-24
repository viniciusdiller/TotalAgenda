import { Trim } from "../../common/decorators/trim.decorator";
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
  Matches,
} from "class-validator";

export const INTAKE_FIELD_TYPES = ["text", "textarea", "boolean", "select"] as const;

export class IntakeFieldDto {
  @IsString()
  @MaxLength(120)
  @Matches(/^[a-zA-Z][a-zA-Z0-9_]*$/, { message: "Chave inválida: use letras, números e _." })
  key!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @Trim()
  label!: string;

  @IsIn(INTAKE_FIELD_TYPES)
  type!: (typeof INTAKE_FIELD_TYPES)[number];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  options?: string[];

  @IsOptional()
  @IsBoolean()
  required?: boolean;
}

export class UpsertIntakeFormDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Trim()
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
