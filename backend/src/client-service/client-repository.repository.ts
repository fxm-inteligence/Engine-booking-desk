import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { ambient } from "../transaction-scope";
import { readFilters, type FilterKind, type ListQuery, type Page } from "../list-query";

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

const FILTER_COLUMNS = new Map<string, FilterKind>([
  ["id", "uuid"],
  ["name", "text"],
  ["phone", "text"],
  ["telegramId", "text"],
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
  private readonly prisma = ambient(new PrismaClient());

  findPage(query: ListQuery): Promise<Page<ClientRecord>> {
    return Promise.all([
      this.prisma.client.findMany({ where: listWhere(query), orderBy: orderBy(query.sort), skip: query.offset, take: query.limit }),
      this.prisma.client.count({ where: listWhere(query) }),
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
