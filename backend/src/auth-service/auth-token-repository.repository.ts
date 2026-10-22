import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import type { ListQuery, Page } from "../list-query";

export interface AuthTokenRecord {
  id: string;
  userId: string;
  kind: string;
  tokenHash: string;
  expiresAt: number;
}

function searchWhere(search: string | undefined) {
  if (search === undefined) return undefined;
  return {
    OR: [
      { userId: { contains: search, mode: "insensitive" as const } },
      { kind: { contains: search, mode: "insensitive" as const } },
      { tokenHash: { contains: search, mode: "insensitive" as const } },
    ],
  };
}

function orderBy(sort: ListQuery["sort"]) {
  const direction = sort?.descending ? ("desc" as const) : ("asc" as const);
  switch (sort?.field) {
    case "id":
      return [{ id: direction }];
    case "userId":
      return [{ userId: direction }, { id: "asc" as const }];
    case "kind":
      return [{ kind: direction }, { id: "asc" as const }];
    case "tokenHash":
      return [{ tokenHash: direction }, { id: "asc" as const }];
    case "expiresAt":
      return [{ expiresAt: direction }, { id: "asc" as const }];
    default:
      return [{ id: "asc" as const }];
  }
}

@Injectable()
export class AuthTokenRepository {
  private readonly prisma = new PrismaClient();

  findPage(query: ListQuery): Promise<Page<AuthTokenRecord>> {
    return Promise.all([
      this.prisma.authToken.findMany({ where: searchWhere(query.search), orderBy: orderBy(query.sort), skip: query.offset, take: query.limit }),
      this.prisma.authToken.count({ where: searchWhere(query.search) }),
    ]).then(([rows, total]) => ({ items: rows, total }));
  }

  findById(id: AuthTokenRecord["id"]): Promise<AuthTokenRecord | null> {
    return this.prisma.authToken.findUnique({ where: { id } });
  }

  findByField(field: keyof AuthTokenRecord & string, value: unknown): Promise<AuthTokenRecord | null> {
    return this.prisma.authToken.findFirst({ where: { [field]: value } });
  }

  create(data: Omit<AuthTokenRecord, "id">): Promise<AuthTokenRecord> {
    return this.prisma.authToken.create({ data });
  }

  update(id: AuthTokenRecord["id"], data: Partial<Omit<AuthTokenRecord, "id">>): Promise<AuthTokenRecord> {
    return this.prisma.authToken.update({ where: { id }, data });
  }

  remove(id: AuthTokenRecord["id"]): Promise<AuthTokenRecord> {
    return this.prisma.authToken.delete({ where: { id } });
  }
}
