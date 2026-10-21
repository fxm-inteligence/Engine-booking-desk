import { TOTAL_COUNT_HEADER, parseListQuery } from "../list-query";
import { AdminKeyGuard } from "./admin-key.guard";
import { CreateMasterRequestDto } from "./dto/create-master-request.dto";
import { UpdateMasterRequestDto } from "./dto/update-master-request.dto";
import { MasterService } from "./master-service.service";
import { Body, Controller, Delete, Get, Param, Post, Put, Query, Res, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Response } from "express";

@ApiTags("MasterService")
@Controller()
export class MasterServiceController {
  constructor(private readonly masterService: MasterService) {}

  @Get("/masters")
  async listMasters(@Query() query: Record<string, unknown>, @Res({ passthrough: true }) response: Response) {
    const page = await this.masterService.listMasters(parseListQuery(query));
    response.setHeader(TOTAL_COUNT_HEADER, page.total);
    return page.items;
  }

  @Get("/masters/:id")
  getMaster(@Param("id") id: string) {
    return this.masterService.getMaster(id);
  }

  @UseGuards(AdminKeyGuard)
  @Post("/masters")
  createMaster(@Body() dto: CreateMasterRequestDto) {
    return this.masterService.createMaster(dto);
  }

  @UseGuards(AdminKeyGuard)
  @Put("/masters/:id")
  updateMaster(@Param("id") id: string, @Body() dto: UpdateMasterRequestDto) {
    return this.masterService.updateMaster(id, dto);
  }

  @UseGuards(AdminKeyGuard)
  @Delete("/masters/:id")
  deleteMaster(@Param("id") id: string) {
    return this.masterService.deleteMaster(id);
  }
}
