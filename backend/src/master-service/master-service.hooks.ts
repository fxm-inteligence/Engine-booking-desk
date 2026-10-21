// Yours: a Regenerate never overwrites this file. Each hook runs around the Service method of the same name.
import type { Hooks } from "../with-hooks";
import type { MasterService } from "./master-service.service";

export const hooks: Hooks<MasterService> = {
  before: {
    // listMasters(...) { /* throw to refuse the call */ },
    // getMaster(...) { /* throw to refuse the call */ },
    // createMaster(...) { /* throw to refuse the call */ },
    // updateMaster(...) { /* throw to refuse the call */ },
    // deleteMaster(...) { /* throw to refuse the call */ },
  },
  after: {
    // listMasters(result, ...) { return result; },
    // getMaster(result, ...) { return result; },
    // createMaster(result, ...) { return result; },
    // updateMaster(result, ...) { return result; },
    // deleteMaster(result, ...) { return result; },
  },
};
