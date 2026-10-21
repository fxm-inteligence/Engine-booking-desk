import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import type { ListQuery, Page } from "../list-query";

export interface MasterRecord {
  id: string;
  name: string;
  specialty?: string;
  phone?: string;
  createdAt?: Date;
}

function searchWhere(search: string | undefined) {
  if (search === undefined) return undefined;
  return {
    OR: [
      { name: { contains: search, mode: "insensitive" as const } },
      { specialty: { contains: search, mode: "insensitive" as const } },
      { phone: { contains: search, mode: "insensitive" as const } },
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
    case "specialty":
      return [{ specialty: direction }, { id: "asc" as const }];
    case "phone":
      return [{ phone: direction }, { id: "asc" as const }];
    case "createdAt":
      return [{ createdAt: direction }, { id: "asc" as const }];
    default:
      return [{ id: "asc" as const }];
  }
}

@Injectable()
export class MasterRepository {
  private readonly prisma = new PrismaClient();

  findPage(query: ListQuery): Promise<Page<MasterRecord>> {
    return Promise.all([
      this.prisma.master.findMany({ where: searchWhere(query.search), orderBy: orderBy(query.sort), skip: query.offset, take: query.limit }),
      this.prisma.master.count({ where: searchWhere(query.search) }),
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
