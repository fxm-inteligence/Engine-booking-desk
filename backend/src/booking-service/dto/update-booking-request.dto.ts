import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsString } from "class-validator";

export class UpdateBookingRequestDto {
  @ApiProperty({ type: String })
  @IsString()
  serviceId: string;

  @ApiProperty({ type: String })
  @IsString()
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
}
