import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsDateString, IsInt, IsNumber, IsOptional, IsString } from "class-validator";

export class PatchServiceRequestDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsInt()
  durationMinutes?: number;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDateString()
  createdAt?: string;
}
