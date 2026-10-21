import { ListQuery } from "../list-query";
import { withHooks } from "../with-hooks";
import { BookingRepository } from "./booking-repository.repository";
import { hooks } from "./booking-service.hooks";
import { CreateBookingRequestDto } from "./dto/create-booking-request.dto";
import { UpdateBookingRequestDto } from "./dto/update-booking-request.dto";
import { Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class BookingService {
  constructor(private readonly bookingRepository: BookingRepository) {}

  listBookings(query: ListQuery) {
    return this.bookingRepository.findPage(query);
  }

  async getBooking(id: string) {
    const record = await this.bookingRepository.findById(id);
    if (!record) throw new NotFoundException();
    return record;
  }

  createBooking(dto: CreateBookingRequestDto) {
    return this.bookingRepository.create({ ...dto, startsAt: new Date(dto.startsAt), createdAt: dto.createdAt === undefined ? undefined : new Date(dto.createdAt) });
  }

  async updateBooking(id: string, dto: UpdateBookingRequestDto) {
    const record = await this.bookingRepository.findById(id);
    if (!record) throw new NotFoundException();
    return this.bookingRepository.update(id, { ...dto, startsAt: dto.startsAt === undefined ? undefined : new Date(dto.startsAt), createdAt: dto.createdAt === undefined ? undefined : new Date(dto.createdAt) });
  }

  async deleteBooking(id: string) {
    const record = await this.bookingRepository.findById(id);
    if (!record) throw new NotFoundException();
    return this.bookingRepository.remove(id);
  }
}

withHooks(BookingService.prototype, hooks);
