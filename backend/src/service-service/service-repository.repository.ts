import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import type { ListQuery, Page } from "../list-query";

export interface ServiceRecord {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
  active?: boolean;
  createdAt?: Date;
}

function searchWhere(search: string | undefined) {
  if (search === undefined) return undefined;
  return {
    OR: [
      { name: { contains: search, mode: "insensitive" as const } },
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
    case "durationMinutes":
      return [{ durationMinutes: direction }, { id: "asc" as const }];
    case "price":
      return [{ price: direction }, { id: "asc" as const }];
    case "active":
      return [{ active: direction }, { id: "asc" as const }];
    case "createdAt":
      return [{ createdAt: direction }, { id: "asc" as const }];
    default:
      return [{ id: "asc" as const }];
  }
}

@Injectable()
export class ServiceRepository {
  private readonly prisma = new PrismaClient();

  findPage(query: ListQuery): Promise<Page<ServiceRecord>> {
    return Promise.all([
      this.prisma.service.findMany({ where: searchWhere(query.search), orderBy: orderBy(query.sort), skip: query.offset, take: query.limit }),
      this.prisma.service.count({ where: searchWhere(query.search) }),
    ]).then(([rows, total]) => ({ items: rows, total }));
  }

  findById(id: ServiceRecord["id"]): Promise<ServiceRecord | null> {
    return this.prisma.service.findUnique({ where: { id } });
  }

  findByField(field: keyof ServiceRecord & string, value: unknown): Promise<ServiceRecord | null> {
    return this.prisma.service.findFirst({ where: { [field]: value } });
  }

  create(data: Omit<ServiceRecord, "id">): Promise<ServiceRecord> {
    return this.prisma.service.create({ data });
  }

  update(id: ServiceRecord["id"], data: Partial<Omit<ServiceRecord, "id">>): Promise<ServiceRecord> {
    return this.prisma.service.update({ where: { id }, data });
  }

  remove(id: ServiceRecord["id"]): Promise<ServiceRecord> {
    return this.prisma.service.delete({ where: { id } });
  }
}
