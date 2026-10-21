import { ListQuery } from "../list-query";
import { withHooks } from "../with-hooks";
import { CreateMasterRequestDto } from "./dto/create-master-request.dto";
import { UpdateMasterRequestDto } from "./dto/update-master-request.dto";
import { MasterRepository } from "./master-repository.repository";
import { hooks } from "./master-service.hooks";
import { Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class MasterService {
  constructor(private readonly masterRepository: MasterRepository) {}

  listMasters(query: ListQuery) {
    return this.masterRepository.findPage(query);
  }

  async getMaster(id: string) {
    const record = await this.masterRepository.findById(id);
    if (!record) throw new NotFoundException();
    return record;
  }

  createMaster(dto: CreateMasterRequestDto) {
    return this.masterRepository.create({ ...dto, createdAt: dto.createdAt === undefined ? undefined : new Date(dto.createdAt) });
  }

  async updateMaster(id: string, dto: UpdateMasterRequestDto) {
    const record = await this.masterRepository.findById(id);
    if (!record) throw new NotFoundException();
    return this.masterRepository.update(id, { ...dto, createdAt: dto.createdAt === undefined ? undefined : new Date(dto.createdAt) });
  }

  async deleteMaster(id: string) {
    const record = await this.masterRepository.findById(id);
    if (!record) throw new NotFoundException();
    return this.masterRepository.remove(id);
  }
}

withHooks(MasterService.prototype, hooks);
