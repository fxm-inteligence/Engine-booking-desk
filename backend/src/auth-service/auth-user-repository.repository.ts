import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import type { ListQuery, Page } from "../list-query";

export interface AccountRecord {
  id: string;
  email: string;
  password: string;
  role: string;
}

function searchWhere(search: string | undefined) {
  if (search === undefined) return undefined;
  return {
    OR: [
      { email: { contains: search, mode: "insensitive" as const } },
      { password: { contains: search, mode: "insensitive" as const } },
      { role: { contains: search, mode: "insensitive" as const } },
    ],
  };
}

function orderBy(sort: ListQuery["sort"]) {
  const direction = sort?.descending ? ("desc" as const) : ("asc" as const);
  switch (sort?.field) {
    case "id":
      return [{ id: direction }];
    case "email":
      return [{ email: direction }, { id: "asc" as const }];
    case "password":
      return [{ password: direction }, { id: "asc" as const }];
    case "role":
      return [{ role: direction }, { id: "asc" as const }];
    default:
      return [{ id: "asc" as const }];
  }
}

@Injectable()
export class AuthUserRepository {
  private readonly prisma = new PrismaClient();

  findPage(query: ListQuery): Promise<Page<AccountRecord>> {
    return Promise.all([
      this.prisma.account.findMany({ where: searchWhere(query.search), orderBy: orderBy(query.sort), skip: query.offset, take: query.limit }),
      this.prisma.account.count({ where: searchWhere(query.search) }),
    ]).then(([rows, total]) => ({ items: rows, total }));
  }

  findById(id: AccountRecord["id"]): Promise<AccountRecord | null> {
    return this.prisma.account.findUnique({ where: { id } });
  }

  findByField(field: keyof AccountRecord & string, value: unknown): Promise<AccountRecord | null> {
    return this.prisma.account.findFirst({ where: { [field]: value } });
  }

  create(data: Omit<AccountRecord, "id">): Promise<AccountRecord> {
    return this.prisma.account.create({ data });
  }

  update(id: AccountRecord["id"], data: Partial<Omit<AccountRecord, "id">>): Promise<AccountRecord> {
    return this.prisma.account.update({ where: { id }, data });
  }

  remove(id: AccountRecord["id"]): Promise<AccountRecord> {
    return this.prisma.account.delete({ where: { id } });
  }
}
