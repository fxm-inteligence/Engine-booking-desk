import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { ambient } from "../transaction-scope";
import { readFilters, type FilterKind, type ListQuery, type Page } from "../list-query";

export interface BookingStatusLogRecord {
  id: string;
  recordId: string;
  fromStatus?: string;
  toStatus: string;
  changedAt: number;
}

function searchWhere(search: string | undefined) {
  if (search === undefined) return undefined;
  return {
    OR: [
      { recordId: { contains: search, mode: "insensitive" as const } },
      { fromStatus: { contains: search, mode: "insensitive" as const } },
      { toStatus: { contains: search, mode: "insensitive" as const } },
    ],
  };
}

const FILTER_COLUMNS = new Map<string, FilterKind>([
  ["id", "uuid"],
  ["recordId", "text"],
  ["fromStatus", "text"],
  ["toStatus", "text"],
  ["changedAt", "number"],
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
    case "recordId":
      return [{ recordId: direction }, { id: "asc" as const }];
    case "fromStatus":
      return [{ fromStatus: direction }, { id: "asc" as const }];
    case "toStatus":
      return [{ toStatus: direction }, { id: "asc" as const }];
    case "changedAt":
      return [{ changedAt: direction }, { id: "asc" as const }];
    default:
      return [{ id: "asc" as const }];
  }
}

@Injectable()
export class BookingStatusLogRepository {
  private readonly prisma = ambient(new PrismaClient());

  findPage(query: ListQuery): Promise<Page<BookingStatusLogRecord>> {
    return Promise.all([
      this.prisma.bookingStatusLog.findMany({ where: listWhere(query), orderBy: orderBy(query.sort), skip: query.offset, take: query.limit }),
      this.prisma.bookingStatusLog.count({ where: listWhere(query) }),
    ]).then(([rows, total]) => ({ items: rows, total }));
  }

  findById(id: BookingStatusLogRecord["id"]): Promise<BookingStatusLogRecord | null> {
    return this.prisma.bookingStatusLog.findUnique({ where: { id } });
  }

  findByField(field: keyof BookingStatusLogRecord & string, value: unknown): Promise<BookingStatusLogRecord | null> {
    return this.prisma.bookingStatusLog.findFirst({ where: { [field]: value } });
  }

  create(data: Omit<BookingStatusLogRecord, "id">): Promise<BookingStatusLogRecord> {
    return this.prisma.bookingStatusLog.create({ data });
  }

  update(id: BookingStatusLogRecord["id"], data: Partial<Omit<BookingStatusLogRecord, "id">>): Promise<BookingStatusLogRecord> {
    return this.prisma.bookingStatusLog.update({ where: { id }, data });
  }

  remove(id: BookingStatusLogRecord["id"]): Promise<BookingStatusLogRecord> {
    return this.prisma.bookingStatusLog.delete({ where: { id } });
  }
}
