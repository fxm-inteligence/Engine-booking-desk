import { TOTAL_COUNT_HEADER, parseListQuery } from "../list-query";
import { AdminKeyGuard } from "./admin-key.guard";
import { ClientService } from "./client-service.service";
import { CreateClientRequestDto } from "./dto/create-client-request.dto";
import { UpdateClientRequestDto } from "./dto/update-client-request.dto";
import { Body, Controller, Delete, Get, Param, Post, Put, Query, Res, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Response } from "express";

@ApiTags("ClientService")
@Controller()
export class ClientServiceController {
  constructor(private readonly clientService: ClientService) {}

  @UseGuards(AdminKeyGuard)
  @Get("/clients")
  async listClients(@Query() query: Record<string, unknown>, @Res({ passthrough: true }) response: Response) {
    const page = await this.clientService.listClients(parseListQuery(query));
    response.setHeader(TOTAL_COUNT_HEADER, page.total);
    return page.items;
  }

  @UseGuards(AdminKeyGuard)
  @Get("/clients/:id")
  getClient(@Param("id") id: string) {
    return this.clientService.getClient(id);
  }

  @UseGuards(AdminKeyGuard)
  @Post("/clients")
  createClient(@Body() dto: CreateClientRequestDto) {
    return this.clientService.createClient(dto);
  }

  @UseGuards(AdminKeyGuard)
  @Put("/clients/:id")
  updateClient(@Param("id") id: string, @Body() dto: UpdateClientRequestDto) {
    return this.clientService.updateClient(id, dto);
  }

  @UseGuards(AdminKeyGuard)
  @Delete("/clients/:id")
  deleteClient(@Param("id") id: string) {
    return this.clientService.deleteClient(id);
  }
}
