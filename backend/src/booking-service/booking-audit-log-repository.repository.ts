import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { ambient } from "../transaction-scope";
import { readFilters, type FilterKind, type ListQuery, type Page } from "../list-query";

export interface BookingAuditLogRecord {
  id: string;
  recordId: string;
  action: string;
  actor?: string;
  changes?: string;
  changedAt: number;
}

function searchWhere(search: string | undefined) {
  if (search === undefined) return undefined;
  return {
    OR: [
      { recordId: { contains: search, mode: "insensitive" as const } },
      { action: { contains: search, mode: "insensitive" as const } },
      { actor: { contains: search, mode: "insensitive" as const } },
      { changes: { contains: search, mode: "insensitive" as const } },
    ],
  };
}

const FILTER_COLUMNS = new Map<string, FilterKind>([
  ["id", "uuid"],
  ["recordId", "text"],
  ["action", "text"],
  ["actor", "text"],
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
    case "action":
      return [{ action: direction }, { id: "asc" as const }];
    case "actor":
      return [{ actor: direction }, { id: "asc" as const }];
    case "changes":
      return [{ changes: direction }, { id: "asc" as const }];
    case "changedAt":
      return [{ changedAt: direction }, { id: "asc" as const }];
    default:
      return [{ id: "asc" as const }];
  }
}

@Injectable()
export class BookingAuditLogRepository {
  private readonly prisma = ambient(new PrismaClient());

  findPage(query: ListQuery): Promise<Page<BookingAuditLogRecord>> {
    return Promise.all([
      this.prisma.bookingAuditLog.findMany({ where: listWhere(query), orderBy: orderBy(query.sort), skip: query.offset, take: query.limit }),
      this.prisma.bookingAuditLog.count({ where: listWhere(query) }),
    ]).then(([rows, total]) => ({ items: rows, total }));
  }

  findById(id: BookingAuditLogRecord["id"]): Promise<BookingAuditLogRecord | null> {
    return this.prisma.bookingAuditLog.findUnique({ where: { id } });
  }

  findByField(field: keyof BookingAuditLogRecord & string, value: unknown): Promise<BookingAuditLogRecord | null> {
    return this.prisma.bookingAuditLog.findFirst({ where: { [field]: value } });
  }

  create(data: Omit<BookingAuditLogRecord, "id">): Promise<BookingAuditLogRecord> {
    return this.prisma.bookingAuditLog.create({ data });
  }

  update(id: BookingAuditLogRecord["id"], data: Partial<Omit<BookingAuditLogRecord, "id">>): Promise<BookingAuditLogRecord> {
    return this.prisma.bookingAuditLog.update({ where: { id }, data });
  }

  remove(id: BookingAuditLogRecord["id"]): Promise<BookingAuditLogRecord> {
    return this.prisma.bookingAuditLog.delete({ where: { id } });
  }
}
