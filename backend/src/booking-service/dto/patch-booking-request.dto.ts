import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsString, IsUUID } from "class-validator";

export class PatchBookingRequestDto {
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

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDateString()
  createdAt?: string;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDateString()
  remindedAt?: string;

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional({ type: String, format: "uuid" })
  @IsOptional()
  @IsUUID()
  masterId?: string;
}
