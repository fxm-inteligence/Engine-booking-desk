import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { ambient } from "../transaction-scope";
import { readFilters, type FilterKind, type ListQuery, type Page } from "../list-query";

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

const FILTER_COLUMNS = new Map<string, FilterKind>([
  ["id", "uuid"],
  ["name", "text"],
  ["durationMinutes", "integer"],
  ["price", "number"],
  ["active", "boolean"],
  ["createdAt", "datetime"],
]);

function listWhere(query: ListQuery) {
  const conditions: Record<string, unknown>[] = readFilters(query.filters, FILTER_COLUMNS).map(
    ({ field, operator, value }) =>
      value === undefined
        ? { id: { in: [] } }
        : { [field]: operator === "equals" ? value : { [operator]: value } },
  );
  const search = searchWhere(query.search);
  if (search) conditions.push(search);
  return { AND: conditions };
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
  private readonly prisma = ambient(new PrismaClient());

  findPage(query: ListQuery): Promise<Page<ServiceRecord>> {
    return Promise.all([
      this.prisma.service.findMany({ where: listWhere(query), orderBy: orderBy(query.sort), skip: query.offset, take: query.limit }),
      this.prisma.service.count({ where: listWhere(query) }),
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
