import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsString } from "class-validator";

export class PatchClientRequestDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  telegramId?: string;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDateString()
  createdAt?: string;
}
