// Yours: a Regenerate never overwrites this file. Each hook runs around the Service method of the same name.
import type { Hooks } from "../with-hooks";
import type { AuthService } from "./auth-service.service";

export const hooks: Hooks<AuthService> = {
  before: {
    // authRegister(...) { /* throw to refuse the call */ },
    // authLogin(...) { /* throw to refuse the call */ },
    // authRefresh(...) { /* throw to refuse the call */ },
    // authLogout(...) { /* throw to refuse the call */ },
  },
  after: {
    // authRegister(result, ...) { return result; },
    // authLogin(result, ...) { return result; },
    // authRefresh(result, ...) { return result; },
    // authLogout(result, ...) { return result; },
  },
};
