import * as api from "./client";

/** GET /bookings */
export function listBookings(): Promise<unknown> {
  return api.request("/bookings");
}

/** PUT /bookings/:id */
export function confirmBooking(id: string, body?: unknown): Promise<unknown> {
  return api.request(`/bookings/${encodeURIComponent(id)}`, { method: "PUT", json: body });
}
