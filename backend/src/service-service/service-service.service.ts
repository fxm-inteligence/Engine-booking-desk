import { ListQuery } from "../list-query";
import { withHooks } from "../with-hooks";
import { CreateServiceRequestDto } from "./dto/create-service-request.dto";
import { UpdateServiceRequestDto } from "./dto/update-service-request.dto";
import { ServiceRepository } from "./service-repository.repository";
import { hooks } from "./service-service.hooks";
import { Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class ServiceService {
  constructor(private readonly serviceRepository: ServiceRepository) {}

  listServices(query: ListQuery) {
    return this.serviceRepository.findPage(query);
  }

  async getService(id: string) {
    const record = await this.serviceRepository.findById(id);
    if (!record) throw new NotFoundException();
    return record;
  }

  createService(dto: CreateServiceRequestDto) {
    return this.serviceRepository.create({ ...dto, createdAt: dto.createdAt === undefined ? undefined : new Date(dto.createdAt) });
  }

  async updateService(id: string, dto: UpdateServiceRequestDto) {
    const record = await this.serviceRepository.findById(id);
    if (!record) throw new NotFoundException();
    return this.serviceRepository.update(id, { ...dto, createdAt: dto.createdAt === undefined ? undefined : new Date(dto.createdAt) });
  }

  async deleteService(id: string) {
    const record = await this.serviceRepository.findById(id);
    if (!record) throw new NotFoundException();
    return this.serviceRepository.remove(id);
  }
}

withHooks(ServiceService.prototype, hooks);
