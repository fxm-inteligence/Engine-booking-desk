import { TOTAL_COUNT_HEADER, parseListQuery } from "../list-query";
import { BookingAuditLogService } from "./booking-audit-log-service.service";
import { StaffGuard } from "./staff.guard";
import { Controller, Get, Param, Query, Res, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Response } from "express";

@ApiTags("BookingAuditLogService")
@Controller()
export class BookingAuditLogServiceController {
  constructor(private readonly bookingAuditLogService: BookingAuditLogService) {}

  @UseGuards(StaffGuard)
  @Get("/booking-audit-logs")
  async listBookingAuditLogs(@Query() query: Record<string, unknown>, @Res({ passthrough: true }) response: Response) {
    const page = await this.bookingAuditLogService.listBookingAuditLogs(parseListQuery(query));
    response.setHeader(TOTAL_COUNT_HEADER, page.total);
    return page.items;
  }

  @UseGuards(StaffGuard)
  @Get("/booking-audit-logs/:id")
  getBookingAuditLog(@Param("id") id: string) {
    return this.bookingAuditLogService.getBookingAuditLog(id);
  }
}
