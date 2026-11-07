// Yours: a Regenerate never overwrites this file. Each hook runs around the Service method of the same name.
import type { Hooks } from "../with-hooks";
import type { BookingIdempotencyKeyService } from "./booking-idempotency-key-service.service";

export const hooks: Hooks<BookingIdempotencyKeyService> = {
  before: {
    // listBookingIdempotencyKeys(...) { /* throw to refuse the call */ },
    // getBookingIdempotencyKey(...) { /* throw to refuse the call */ },
  },
  after: {
    // listBookingIdempotencyKeys(result, ...) { return result; },
    // getBookingIdempotencyKey(result, ...) { return result; },
  },
};
