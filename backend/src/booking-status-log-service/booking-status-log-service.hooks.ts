// Yours: a Regenerate never overwrites this file. Each hook runs around the Service method of the same name.
import type { Hooks } from "../with-hooks";
import type { BookingStatusLogService } from "./booking-status-log-service.service";

export const hooks: Hooks<BookingStatusLogService> = {
  before: {
    // listBookingStatusLogs(...) { /* throw to refuse the call */ },
    // getBookingStatusLog(...) { /* throw to refuse the call */ },
  },
  after: {
    // listBookingStatusLogs(result, ...) { return result; },
    // getBookingStatusLog(result, ...) { return result; },
  },
};
