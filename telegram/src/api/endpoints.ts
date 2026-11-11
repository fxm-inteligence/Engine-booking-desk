import * as api from "./client";

/** GET /services */
export function listServices(token?: string): Promise<unknown> {
  return api.request("/services", { token });
}

/** GET /services */
export function services(token?: string): Promise<unknown> {
  return api.request("/services", { token });
}

/** GET /masters */
export function masters(token?: string): Promise<unknown> {
  return api.request("/masters", { token });
}

/** GET /bookings/free?masterId=:master&lengthKey=:service&date=:date */
export function freeTimes(master: string, service: string, date: string, token?: string): Promise<unknown> {
  return api.request(`/bookings/free?masterId=${encodeURIComponent(master)}&lengthKey=${encodeURIComponent(service)}&date=${encodeURIComponent(date)}`, { token });
}

/** POST /bookings */
export function book(body?: unknown, token?: string): Promise<unknown> {
  return api.request("/bookings", { method: "POST", json: body, token });
}
