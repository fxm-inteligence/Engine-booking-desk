import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class AuthLogoutRequestDto {
  @ApiProperty({ type: String })
  @IsString()
  refreshToken: string;
}
