import { TOTAL_COUNT_HEADER, parseListQuery } from "../list-query";
import { CreateServiceRequestDto } from "./dto/create-service-request.dto";
import { UpdateServiceRequestDto } from "./dto/update-service-request.dto";
import { ServiceService } from "./service-service.service";
import { StaffGuard } from "./staff.guard";
import { Body, Controller, Delete, Get, Param, Post, Put, Query, Res, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Response } from "express";

@ApiTags("ServiceService")
@Controller()
export class ServiceServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Get("/services")
  async listServices(@Query() query: Record<string, unknown>, @Res({ passthrough: true }) response: Response) {
    const page = await this.serviceService.listServices(parseListQuery(query));
    response.setHeader(TOTAL_COUNT_HEADER, page.total);
    return page.items;
  }

  @Get("/services/:id")
  getService(@Param("id") id: string) {
    return this.serviceService.getService(id);
  }

  @UseGuards(StaffGuard)
  @Post("/services")
  createService(@Body() dto: CreateServiceRequestDto) {
    return this.serviceService.createService(dto);
  }

  @UseGuards(StaffGuard)
  @Put("/services/:id")
  updateService(@Param("id") id: string, @Body() dto: UpdateServiceRequestDto) {
    return this.serviceService.updateService(id, dto);
  }

  @UseGuards(StaffGuard)
  @Delete("/services/:id")
  deleteService(@Param("id") id: string) {
    return this.serviceService.deleteService(id);
  }
}
