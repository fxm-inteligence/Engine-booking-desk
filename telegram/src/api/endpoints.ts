import * as api from "./client";

/** GET /services */
export function listServices(token?: string): Promise<unknown> {
  return api.request("/services", { token });
}

/** POST /bookings */
export function createBooking(body?: unknown, token?: string): Promise<unknown> {
  return api.request("/bookings", { method: "POST", json: body, token });
}
