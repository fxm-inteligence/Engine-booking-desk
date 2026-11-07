import { TOTAL_COUNT_HEADER, parseListQuery } from "../list-query";
import { BookingIdempotencyKeyService } from "./booking-idempotency-key-service.service";
import { StaffGuard } from "./staff.guard";
import { Controller, Get, Param, Query, Res, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Response } from "express";

@ApiTags("BookingIdempotencyKeyService")
@Controller()
export class BookingIdempotencyKeyServiceController {
  constructor(private readonly bookingIdempotencyKeyService: BookingIdempotencyKeyService) {}

  @UseGuards(StaffGuard)
  @Get("/booking-idempotency-keys")
  async listBookingIdempotencyKeys(@Query() query: Record<string, unknown>, @Res({ passthrough: true }) response: Response) {
    const page = await this.bookingIdempotencyKeyService.listBookingIdempotencyKeys(parseListQuery(query));
    response.setHeader(TOTAL_COUNT_HEADER, page.total);
    return page.items;
  }

  @UseGuards(StaffGuard)
  @Get("/booking-idempotency-keys/:id")
  getBookingIdempotencyKey(@Param("id") id: string) {
    return this.bookingIdempotencyKeyService.getBookingIdempotencyKey(id);
  }
}
