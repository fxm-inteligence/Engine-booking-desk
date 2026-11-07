// Yours: a Regenerate never overwrites this file. Each hook runs around the Service method of the same name.
import type { Hooks } from "../with-hooks";
import type { BookingAuditLogService } from "./booking-audit-log-service.service";

export const hooks: Hooks<BookingAuditLogService> = {
  before: {
    // listBookingAuditLogs(...) { /* throw to refuse the call */ },
    // getBookingAuditLog(...) { /* throw to refuse the call */ },
  },
  after: {
    // listBookingAuditLogs(result, ...) { return result; },
    // getBookingAuditLog(result, ...) { return result; },
  },
};
