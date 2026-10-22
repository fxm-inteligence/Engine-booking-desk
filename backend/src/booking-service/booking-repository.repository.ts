import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import type { ListQuery, Page } from "../list-query";

export interface BookingRecord {
  id: string;
  clientName: string;
  clientPhone: string;
  startsAt: Date;
  status?: string;
  notes?: string;
  createdAt?: Date;
  serviceId: string;
  masterId: string;
}

function searchWhere(search: string | undefined) {
  if (search === undefined) return undefined;
  return {
    OR: [
      { clientName: { contains: search, mode: "insensitive" as const } },
      { clientPhone: { contains: search, mode: "insensitive" as const } },
      { status: { contains: search, mode: "insensitive" as const } },
      { notes: { contains: search, mode: "insensitive" as const } },
    ],
  };
}

function orderBy(sort: ListQuery["sort"]) {
  const direction = sort?.descending ? ("desc" as const) : ("asc" as const);
  switch (sort?.field) {
    case "id":
      return [{ id: direction }];
    case "clientName":
      return [{ clientName: direction }, { id: "asc" as const }];
    case "clientPhone":
      return [{ clientPhone: direction }, { id: "asc" as const }];
    case "startsAt":
      return [{ startsAt: direction }, { id: "asc" as const }];
    case "status":
      return [{ status: direction }, { id: "asc" as const }];
    case "notes":
      return [{ notes: direction }, { id: "asc" as const }];
    case "createdAt":
      return [{ createdAt: direction }, { id: "asc" as const }];
    case "serviceId":
      return [{ serviceId: direction }, { id: "asc" as const }];
    case "masterId":
      return [{ masterId: direction }, { id: "asc" as const }];
    default:
      return [{ id: "asc" as const }];
  }
}

@Injectable()
export class BookingRepository {
  private readonly prisma = new PrismaClient();

  findPage(query: ListQuery): Promise<Page<BookingRecord>> {
    return Promise.all([
      this.prisma.booking.findMany({ where: searchWhere(query.search), orderBy: orderBy(query.sort), skip: query.offset, take: query.limit }),
      this.prisma.booking.count({ where: searchWhere(query.search) }),
    ]).then(([rows, total]) => ({ items: rows, total }));
  }

  findById(id: BookingRecord["id"]): Promise<BookingRecord | null> {
    return this.prisma.booking.findUnique({ where: { id } });
  }

  findByField(field: keyof BookingRecord & string, value: unknown): Promise<BookingRecord | null> {
    return this.prisma.booking.findFirst({ where: { [field]: value } });
  }

  create(data: Omit<BookingRecord, "id">): Promise<BookingRecord> {
    return this.prisma.booking.create({ data });
  }

  update(id: BookingRecord["id"], data: Partial<Omit<BookingRecord, "id">>): Promise<BookingRecord> {
    return this.prisma.booking.update({ where: { id }, data });
  }

  remove(id: BookingRecord["id"]): Promise<BookingRecord> {
    return this.prisma.booking.delete({ where: { id } });
  }
}
