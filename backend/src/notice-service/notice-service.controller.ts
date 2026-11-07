import { TOTAL_COUNT_HEADER, parseListQuery } from "../list-query";
import { CreateNoticeRequestDto } from "./dto/create-notice-request.dto";
import { PatchNoticeRequestDto } from "./dto/patch-notice-request.dto";
import { UpdateNoticeRequestDto } from "./dto/update-notice-request.dto";
import { NoticeService } from "./notice-service.service";
import { StaffGuard } from "./staff.guard";
import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Res, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Response } from "express";

@ApiTags("NoticeService")
@Controller()
export class NoticeServiceController {
  constructor(private readonly noticeService: NoticeService) {}

  @UseGuards(StaffGuard)
  @Get("/notices")
  async listNotices(@Query() query: Record<string, unknown>, @Res({ passthrough: true }) response: Response) {
    const page = await this.noticeService.listNotices(parseListQuery(query));
    response.setHeader(TOTAL_COUNT_HEADER, page.total);
    return page.items;
  }

  @UseGuards(StaffGuard)
  @Get("/notices/:id")
  getNotice(@Param("id") id: string) {
    return this.noticeService.getNotice(id);
  }

  @UseGuards(StaffGuard)
  @Post("/notices")
  createNotice(@Body() dto: CreateNoticeRequestDto) {
    return this.noticeService.createNotice(dto);
  }

  @UseGuards(StaffGuard)
  @Put("/notices/:id")
  updateNotice(@Param("id") id: string, @Body() dto: UpdateNoticeRequestDto) {
    return this.noticeService.updateNotice(id, dto);
  }

  @UseGuards(StaffGuard)
  @Patch("/notices/:id")
  patchNotice(@Param("id") id: string, @Body() dto: PatchNoticeRequestDto) {
    return this.noticeService.patchNotice(id, dto);
  }

  @UseGuards(StaffGuard)
  @Delete("/notices/:id")
  deleteNotice(@Param("id") id: string) {
    return this.noticeService.deleteNotice(id);
  }
}
