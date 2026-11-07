import { ListQuery } from "../list-query";
import { withHooks } from "../with-hooks";
import { CreateNoticeRequestDto } from "./dto/create-notice-request.dto";
import { PatchNoticeRequestDto } from "./dto/patch-notice-request.dto";
import { UpdateNoticeRequestDto } from "./dto/update-notice-request.dto";
import { NoticeRepository } from "./notice-repository.repository";
import { hooks } from "./notice-service.hooks";
import { Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class NoticeService {
  constructor(private readonly noticeRepository: NoticeRepository) {}

  listNotices(query: ListQuery) {
    return this.noticeRepository.findPage(query);
  }

  async getNotice(id: string) {
    const record = await this.noticeRepository.findById(id);
    if (!record) throw new NotFoundException();
    return record;
  }

  createNotice(dto: CreateNoticeRequestDto) {
    return this.noticeRepository.create({ ...dto, startsAt: new Date(dto.startsAt), seenAt: dto.seenAt === undefined ? undefined : new Date(dto.seenAt), createdAt: dto.createdAt === undefined ? undefined : new Date(dto.createdAt) });
  }

  async updateNotice(id: string, dto: UpdateNoticeRequestDto) {
    const record = await this.noticeRepository.findById(id);
    if (!record) throw new NotFoundException();
    return this.noticeRepository.update(id, { ...dto, startsAt: dto.startsAt === undefined ? undefined : new Date(dto.startsAt), seenAt: dto.seenAt === undefined ? undefined : new Date(dto.seenAt), createdAt: dto.createdAt === undefined ? undefined : new Date(dto.createdAt) });
  }

  async patchNotice(id: string, dto: PatchNoticeRequestDto) {
    const record = await this.noticeRepository.findById(id);
    if (!record) throw new NotFoundException();
    return this.noticeRepository.update(id, { ...dto, startsAt: dto.startsAt === undefined ? undefined : new Date(dto.startsAt), seenAt: dto.seenAt === undefined ? undefined : new Date(dto.seenAt), createdAt: dto.createdAt === undefined ? undefined : new Date(dto.createdAt) });
  }

  async deleteNotice(id: string) {
    const record = await this.noticeRepository.findById(id);
    if (!record) throw new NotFoundException();
    return this.noticeRepository.remove(id);
  }
}

withHooks(NoticeService.prototype, hooks);
