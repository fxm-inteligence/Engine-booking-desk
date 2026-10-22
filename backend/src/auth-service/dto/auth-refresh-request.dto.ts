import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class AuthRefreshRequestDto {
  @ApiProperty({ type: String })
  @IsString()
  refreshToken: string;
}
