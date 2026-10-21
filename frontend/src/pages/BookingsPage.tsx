import { useAppStore } from "../store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApiWrite } from "@/lib/use-api-data";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";

const BookingsPageSchema = z.object({
  notes: z.string().min(1, "Required"),
  status: z.string().min(1, "Required"),
  startsAt: z.string().min(1, "Required"),
  clientPhone: z.string().min(1, "Required"),
  clientName: z.string().min(1, "Required"),
  masterId: z.string().min(1, "Required"),
  serviceId: z.string().min(1, "Required"),
});
type BookingsPageFormValues = z.infer<typeof BookingsPageSchema>;

export default function BookingsPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<BookingsPageFormValues>({ resolver: zodResolver(BookingsPageSchema) });
  const addSubmittedEntry = useAppStore((state) => state.addSubmittedEntry);
  const addBooking = useApiWrite("/bookings", "POST");

  async function onSubmit(values: BookingsPageFormValues) {
    addSubmittedEntry(values);
    try {
      await addBooking.run(values);

      reset();
    } catch {
      // Surfaced through the Write Block's `error`.
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <label className="flex flex-col gap-1 text-sm"><span>Услуга (ID)</span><Input {...register("serviceId")} /></label>{errors.serviceId && <p className="text-red-500 text-sm">{errors.serviceId.message}</p>}<label className="flex flex-col gap-1 text-sm"><span>Мастер (ID)</span><Input {...register("masterId")} /></label>{errors.masterId && <p className="text-red-500 text-sm">{errors.masterId.message}</p>}<label className="flex flex-col gap-1 text-sm"><span>Ваше имя</span><Input {...register("clientName")} /></label>{errors.clientName && <p className="text-red-500 text-sm">{errors.clientName.message}</p>}<label className="flex flex-col gap-1 text-sm"><span>Телефон</span><Input {...register("clientPhone")} /></label>{errors.clientPhone && <p className="text-red-500 text-sm">{errors.clientPhone.message}</p>}<label className="flex flex-col gap-1 text-sm"><span>Дата и время</span><Input type="datetime-local" {...register("startsAt")} /></label>{errors.startsAt && <p className="text-red-500 text-sm">{errors.startsAt.message}</p>}<label className="flex flex-col gap-1 text-sm"><span>Статус</span><Input {...register("status")} /></label>{errors.status && <p className="text-red-500 text-sm">{errors.status.message}</p>}<label className="flex flex-col gap-1 text-sm"><span>Комментарий</span><textarea className="rounded-md border px-3 py-2" {...register("notes")}></textarea></label>{errors.notes && <p className="text-red-500 text-sm">{errors.notes.message}</p>}<Button type="submit">Записаться</Button>
      </form>
    </motion.div>
  );
}
