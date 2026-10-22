// Yours: a Regenerate never overwrites this file. Each hook runs around the Service method of the same name.
import { ConflictException } from "@nestjs/common";
import { database } from "../prisma-client";
import type { Hooks } from "../with-hooks";
import type { MasterService } from "./master-service.service";

export const hooks: Hooks<MasterService> = {
  before: {
    // listMasters(...) { /* throw to refuse the call */ },
    // getMaster(...) { /* throw to refuse the call */ },
    // createMaster(...) { /* throw to refuse the call */ },
    // updateMaster(...) { /* throw to refuse the call */ },
    async deleteMaster(id) {
      const db = database();
      if (db && (await db.booking.count({ where: { masterId: id } })) > 0) throw new ConflictException("У мастера есть записи, удалить его нельзя");
    },
  },
  after: {
    // listMasters(result, ...) { return result; },
    // getMaster(result, ...) { return result; },
    // createMaster(result, ...) { return result; },
    // updateMaster(result, ...) { return result; },
    // deleteMaster(result, ...) { return result; },
  },
};
