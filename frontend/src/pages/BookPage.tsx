import { useAppStore } from "../store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { busyDays } from "@/lib/busy-days";
import { useApiData, useApiWrite } from "@/lib/use-api-data";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";

const BookPageSchema = z.object({
  startsAt: z.string().min(1, "Required"),
  clientPhone: z.string().min(1, "Required"),
  clientName: z.string().min(1, "Required"),
  masterId: z.string().min(1, "Required"),
  serviceId: z.string().min(1, "Required"),
});
type BookPageFormValues = z.infer<typeof BookPageSchema>;

export default function BookPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<BookPageFormValues>({ resolver: zodResolver(BookPageSchema) });
  const addSubmittedEntry = useAppStore((state) => state.addSubmittedEntry);
  const servicesForBooking = useApiData<Record<string, unknown>[]>("/services");
  const mastersForBooking = useApiData<Record<string, unknown>[]>("/masters");
  const addBooking = useApiWrite("/bookings", "POST");
  const busyPublic = useApiData<Record<string, unknown>[]>("/bookings/busy");

  async function onSubmit(values: BookPageFormValues) {
    addSubmittedEntry(values);
    try {
      await addBooking.run(values);
      await servicesForBooking.reload();
      await mastersForBooking.reload();
      await busyPublic.reload();
      reset();
    } catch {
      // Surfaced through the Write Block's `error`.
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <label className="flex flex-col gap-1 text-sm"><span>Услуга</span><select className="rounded-md border px-3 py-2" {...register("serviceId")}><option value=""></option>{(servicesForBooking.data ?? []).map((row, index) => (<option key={index} value={String(row["id"] ?? "")}>{String(row["name"] ?? row["id"] ?? "")}</option>))}</select></label>{errors.serviceId && <p className="text-red-500 text-sm">{errors.serviceId.message}</p>}<label className="flex flex-col gap-1 text-sm"><span>Мастер</span><select className="rounded-md border px-3 py-2" {...register("masterId")}><option value=""></option>{(mastersForBooking.data ?? []).map((row, index) => (<option key={index} value={String(row["id"] ?? "")}>{String(row["name"] ?? row["id"] ?? "")}</option>))}</select></label>{errors.masterId && <p className="text-red-500 text-sm">{errors.masterId.message}</p>}<label className="flex flex-col gap-1 text-sm"><span>Ваше имя</span><Input {...register("clientName")} /></label>{errors.clientName && <p className="text-red-500 text-sm">{errors.clientName.message}</p>}<label className="flex flex-col gap-1 text-sm"><span>Телефон</span><Input {...register("clientPhone")} /></label>{errors.clientPhone && <p className="text-red-500 text-sm">{errors.clientPhone.message}</p>}<label className="flex flex-col gap-1 text-sm"><span>Дата и время</span><Input type="datetime-local" {...register("startsAt")} /></label>{errors.startsAt && <p className="text-red-500 text-sm">{errors.startsAt.message}</p>}<Button type="submit">Записаться</Button><div className="grid gap-1 text-sm">{busyDays(busyPublic.data, 14, "").map((day) => (<div key={day.key} className="flex flex-wrap items-baseline gap-2"><span className="w-28 font-medium">{day.label}</span>{day.times.length === 0 ? <span className="text-slate-500">Свободно</span> : day.times.map((time) => (<span key={time} className="rounded bg-slate-200 px-2 py-0.5">{time}</span>))}</div>))}</div>
      </form>
    </motion.div>
  );
}
