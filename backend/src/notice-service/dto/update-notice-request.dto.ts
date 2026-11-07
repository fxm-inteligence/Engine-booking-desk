import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsString, IsUUID } from "class-validator";

export class UpdateNoticeRequestDto {
  @ApiProperty({ type: String })
  @IsString()
  kind: string;

  @ApiProperty({ type: String, format: "uuid" })
  @IsUUID()
  masterId: string;

  @ApiProperty({ type: String })
  @IsString()
  clientName: string;

  @ApiProperty({ type: String })
  @IsString()
  clientPhone: string;

  @ApiProperty({ type: String, format: "date-time" })
  @IsDateString()
  startsAt: string;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDateString()
  seenAt?: string;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDateString()
  createdAt?: string;
}
