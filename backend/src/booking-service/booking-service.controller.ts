import { TOTAL_COUNT_HEADER, parseListQuery } from "../list-query";
import { BookingService } from "./booking-service.service";
import { CreateBookingRequestDto } from "./dto/create-booking-request.dto";
import { UpdateBookingRequestDto } from "./dto/update-booking-request.dto";
import { StaffGuard } from "./staff.guard";
import { Body, Controller, Delete, Get, Param, Post, Put, Query, Res, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Response } from "express";

@ApiTags("BookingService")
@Controller()
export class BookingServiceController {
  constructor(private readonly bookingService: BookingService) {}

  @UseGuards(StaffGuard)
  @Get("/bookings")
  async listBookings(@Query() query: Record<string, unknown>, @Res({ passthrough: true }) response: Response) {
    const page = await this.bookingService.listBookings(parseListQuery(query));
    response.setHeader(TOTAL_COUNT_HEADER, page.total);
    return page.items;
  }

  @UseGuards(StaffGuard)
  @Get("/bookings/:id")
  getBooking(@Param("id") id: string) {
    return this.bookingService.getBooking(id);
  }

  @Post("/bookings")
  createBooking(@Body() dto: CreateBookingRequestDto) {
    return this.bookingService.createBooking(dto);
  }

  @UseGuards(StaffGuard)
  @Put("/bookings/:id")
  updateBooking(@Param("id") id: string, @Body() dto: UpdateBookingRequestDto) {
    return this.bookingService.updateBooking(id, dto);
  }

  @UseGuards(StaffGuard)
  @Delete("/bookings/:id")
  deleteBooking(@Param("id") id: string) {
    return this.bookingService.deleteBooking(id);
  }
}
