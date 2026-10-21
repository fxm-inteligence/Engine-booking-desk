import { ListQuery } from "../list-query";
import { withHooks } from "../with-hooks";
import { ClientRepository } from "./client-repository.repository";
import { hooks } from "./client-service.hooks";
import { CreateClientRequestDto } from "./dto/create-client-request.dto";
import { UpdateClientRequestDto } from "./dto/update-client-request.dto";
import { Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class ClientService {
  constructor(private readonly clientRepository: ClientRepository) {}

  listClients(query: ListQuery) {
    return this.clientRepository.findPage(query);
  }

  async getClient(id: string) {
    const record = await this.clientRepository.findById(id);
    if (!record) throw new NotFoundException();
    return record;
  }

  createClient(dto: CreateClientRequestDto) {
    return this.clientRepository.create({ ...dto, createdAt: dto.createdAt === undefined ? undefined : new Date(dto.createdAt) });
  }

  async updateClient(id: string, dto: UpdateClientRequestDto) {
    const record = await this.clientRepository.findById(id);
    if (!record) throw new NotFoundException();
    return this.clientRepository.update(id, { ...dto, createdAt: dto.createdAt === undefined ? undefined : new Date(dto.createdAt) });
  }

  async deleteClient(id: string) {
    const record = await this.clientRepository.findById(id);
    if (!record) throw new NotFoundException();
    return this.clientRepository.remove(id);
  }
}

withHooks(ClientService.prototype, hooks);
