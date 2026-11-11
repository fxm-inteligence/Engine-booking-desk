import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { ambient } from "../transaction-scope";
import { readFilters, type FilterKind, type ListQuery, type Page } from "../list-query";

export interface MasterRecord {
  id: string;
  name: string;
  specialty?: string;
  phone?: string;
  createdAt?: Date;
  workHours?: string;
  daysOff?: string;
}

function searchWhere(search: string | undefined) {
  if (search === undefined) return undefined;
  return {
    OR: [
      { name: { contains: search, mode: "insensitive" as const } },
      { specialty: { contains: search, mode: "insensitive" as const } },
      { phone: { contains: search, mode: "insensitive" as const } },
      { workHours: { contains: search, mode: "insensitive" as const } },
      { daysOff: { contains: search, mode: "insensitive" as const } },
    ],
  };
}

const FILTER_COLUMNS = new Map<string, FilterKind>([
  ["id", "uuid"],
  ["name", "text"],
  ["specialty", "text"],
  ["phone", "text"],
  ["createdAt", "datetime"],
  ["workHours", "text"],
  ["daysOff", "text"],
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
    case "specialty":
      return [{ specialty: direction }, { id: "asc" as const }];
    case "phone":
      return [{ phone: direction }, { id: "asc" as const }];
    case "createdAt":
      return [{ createdAt: direction }, { id: "asc" as const }];
    case "workHours":
      return [{ workHours: direction }, { id: "asc" as const }];
    case "daysOff":
      return [{ daysOff: direction }, { id: "asc" as const }];
    default:
      return [{ id: "asc" as const }];
  }
}

@Injectable()
export class MasterRepository {
  private readonly prisma = ambient(new PrismaClient());

  findPage(query: ListQuery): Promise<Page<MasterRecord>> {
    return Promise.all([
      this.prisma.master.findMany({ where: listWhere(query), orderBy: orderBy(query.sort), skip: query.offset, take: query.limit }),
      this.prisma.master.count({ where: listWhere(query) }),
    ]).then(([rows, total]) => ({ items: rows, total }));
  }

  findById(id: MasterRecord["id"]): Promise<MasterRecord | null> {
    return this.prisma.master.findUnique({ where: { id } });
  }

  findByField(field: keyof MasterRecord & string, value: unknown): Promise<MasterRecord | null> {
    return this.prisma.master.findFirst({ where: { [field]: value } });
  }

  create(data: Omit<MasterRecord, "id">): Promise<MasterRecord> {
    return this.prisma.master.create({ data });
  }

  update(id: MasterRecord["id"], data: Partial<Omit<MasterRecord, "id">>): Promise<MasterRecord> {
    return this.prisma.master.update({ where: { id }, data });
  }

  remove(id: MasterRecord["id"]): Promise<MasterRecord> {
    return this.prisma.master.delete({ where: { id } });
  }
}
