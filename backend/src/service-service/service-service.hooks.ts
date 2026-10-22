// Yours: a Regenerate never overwrites this file. Each hook runs around the Service method of the same name.
import { ConflictException } from "@nestjs/common";
import { database } from "../prisma-client";
import type { Hooks } from "../with-hooks";
import type { ServiceService } from "./service-service.service";

export const hooks: Hooks<ServiceService> = {
  before: {
    // listServices(...) { /* throw to refuse the call */ },
    // getService(...) { /* throw to refuse the call */ },
    // createService(...) { /* throw to refuse the call */ },
    // updateService(...) { /* throw to refuse the call */ },
    async deleteService(id) {
      const db = database();
      if (db && (await db.booking.count({ where: { serviceId: id } })) > 0) throw new ConflictException("У услуги есть записи, удалить её нельзя");
    },
  },
  after: {
    // listServices(result, ...) { return result; },
    // getService(result, ...) { return result; },
    // createService(result, ...) { return result; },
    // updateService(result, ...) { return result; },
    // deleteService(result, ...) { return result; },
  },
};
