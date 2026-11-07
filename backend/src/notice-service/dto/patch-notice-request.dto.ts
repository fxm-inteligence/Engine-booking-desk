import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsString, IsUUID } from "class-validator";

export class PatchNoticeRequestDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  kind?: string;

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  masterId?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  clientName?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  clientPhone?: string;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDateString()
  seenAt?: string;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDateString()
  createdAt?: string;
}
