import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { ambient } from "../transaction-scope";
import { readFilters, type FilterKind, type ListQuery, type Page } from "../list-query";

export interface NoticeRecord {
  id: string;
  kind: string;
  masterId: string;
  clientName: string;
  clientPhone: string;
  startsAt: Date;
  seenAt?: Date;
  createdAt?: Date;
}

function searchWhere(search: string | undefined) {
  if (search === undefined) return undefined;
  return {
    OR: [
      { kind: { contains: search, mode: "insensitive" as const } },
      { clientName: { contains: search, mode: "insensitive" as const } },
      { clientPhone: { contains: search, mode: "insensitive" as const } },
    ],
  };
}

const FILTER_COLUMNS = new Map<string, FilterKind>([
  ["id", "uuid"],
  ["kind", "text"],
  ["masterId", "uuid"],
  ["clientName", "text"],
  ["clientPhone", "text"],
  ["startsAt", "datetime"],
  ["seenAt", "datetime"],
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
    case "kind":
      return [{ kind: direction }, { id: "asc" as const }];
    case "masterId":
      return [{ masterId: direction }, { id: "asc" as const }];
    case "clientName":
      return [{ clientName: direction }, { id: "asc" as const }];
    case "clientPhone":
      return [{ clientPhone: direction }, { id: "asc" as const }];
    case "startsAt":
      return [{ startsAt: direction }, { id: "asc" as const }];
    case "seenAt":
      return [{ seenAt: direction }, { id: "asc" as const }];
    case "createdAt":
      return [{ createdAt: direction }, { id: "asc" as const }];
    default:
      return [{ id: "asc" as const }];
  }
}

@Injectable()
export class NoticeRepository {
  private readonly prisma = ambient(new PrismaClient());

  findPage(query: ListQuery): Promise<Page<NoticeRecord>> {
    return Promise.all([
      this.prisma.notice.findMany({ where: listWhere(query), orderBy: orderBy(query.sort), skip: query.offset, take: query.limit }),
      this.prisma.notice.count({ where: listWhere(query) }),
    ]).then(([rows, total]) => ({ items: rows, total }));
  }

  findById(id: NoticeRecord["id"]): Promise<NoticeRecord | null> {
    return this.prisma.notice.findUnique({ where: { id } });
  }

  findByField(field: keyof NoticeRecord & string, value: unknown): Promise<NoticeRecord | null> {
    return this.prisma.notice.findFirst({ where: { [field]: value } });
  }

  create(data: Omit<NoticeRecord, "id">): Promise<NoticeRecord> {
    return this.prisma.notice.create({ data });
  }

  update(id: NoticeRecord["id"], data: Partial<Omit<NoticeRecord, "id">>): Promise<NoticeRecord> {
    return this.prisma.notice.update({ where: { id }, data });
  }

  remove(id: NoticeRecord["id"]): Promise<NoticeRecord> {
    return this.prisma.notice.delete({ where: { id } });
  }
}
