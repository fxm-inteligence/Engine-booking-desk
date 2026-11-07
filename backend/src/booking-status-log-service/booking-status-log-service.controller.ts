import { TOTAL_COUNT_HEADER, parseListQuery } from "../list-query";
import { BookingStatusLogService } from "./booking-status-log-service.service";
import { StaffGuard } from "./staff.guard";
import { Controller, Get, Param, Query, Res, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Response } from "express";

@ApiTags("BookingStatusLogService")
@Controller()
export class BookingStatusLogServiceController {
  constructor(private readonly bookingStatusLogService: BookingStatusLogService) {}

  @UseGuards(StaffGuard)
  @Get("/booking-status-logs")
  async listBookingStatusLogs(@Query() query: Record<string, unknown>, @Res({ passthrough: true }) response: Response) {
    const page = await this.bookingStatusLogService.listBookingStatusLogs(parseListQuery(query));
    response.setHeader(TOTAL_COUNT_HEADER, page.total);
    return page.items;
  }

  @UseGuards(StaffGuard)
  @Get("/booking-status-logs/:id")
  getBookingStatusLog(@Param("id") id: string) {
    return this.bookingStatusLogService.getBookingStatusLog(id);
  }
}
