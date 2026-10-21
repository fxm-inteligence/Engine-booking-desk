import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import type { ListQuery, Page } from "../list-query";

export interface ClientRecord {
  id: string;
  name: string;
  phone: string;
  telegramId?: string;
  createdAt?: Date;
}

function searchWhere(search: string | undefined) {
  if (search === undefined) return undefined;
  return {
    OR: [
      { name: { contains: search, mode: "insensitive" as const } },
      { phone: { contains: search, mode: "insensitive" as const } },
      { telegramId: { contains: search, mode: "insensitive" as const } },
    ],
  };
}

function orderBy(sort: ListQuery["sort"]) {
  const direction = sort?.descending ? ("desc" as const) : ("asc" as const);
  switch (sort?.field) {
    case "id":
      return [{ id: direction }];
    case "name":
      return [{ name: direction }, { id: "asc" as const }];
    case "phone":
      return [{ phone: direction }, { id: "asc" as const }];
    case "telegramId":
      return [{ telegramId: direction }, { id: "asc" as const }];
    case "createdAt":
      return [{ createdAt: direction }, { id: "asc" as const }];
    default:
      return [{ id: "asc" as const }];
  }
}

@Injectable()
export class ClientRepository {
  private readonly prisma = new PrismaClient();

  findPage(query: ListQuery): Promise<Page<ClientRecord>> {
    return Promise.all([
      this.prisma.client.findMany({ where: searchWhere(query.search), orderBy: orderBy(query.sort), skip: query.offset, take: query.limit }),
      this.prisma.client.count({ where: searchWhere(query.search) }),
    ]).then(([rows, total]) => ({ items: rows, total }));
  }

  findById(id: ClientRecord["id"]): Promise<ClientRecord | null> {
    return this.prisma.client.findUnique({ where: { id } });
  }

  findByField(field: keyof ClientRecord & string, value: unknown): Promise<ClientRecord | null> {
    return this.prisma.client.findFirst({ where: { [field]: value } });
  }

  create(data: Omit<ClientRecord, "id">): Promise<ClientRecord> {
    return this.prisma.client.create({ data });
  }

  update(id: ClientRecord["id"], data: Partial<Omit<ClientRecord, "id">>): Promise<ClientRecord> {
    return this.prisma.client.update({ where: { id }, data });
  }

  remove(id: ClientRecord["id"]): Promise<ClientRecord> {
    return this.prisma.client.delete({ where: { id } });
  }
}
