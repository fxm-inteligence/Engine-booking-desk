import { useRequireAuth } from "@/lib/use-require-auth";
import { Button } from "@/components/ui/button";
import { useApiData, useApiWrite } from "@/lib/use-api-data";
import { motion } from "framer-motion";

function BookingsIdPageContent() {
  const bookingOne = useApiData<Record<string, unknown>>("/bookings/:id");
  const bookingNext = useApiData<Record<string, unknown>>("/bookings/:id/transitions");
  const bookingMove = useApiWrite("/bookings/:id", "PATCH");
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex flex-wrap items-center gap-2">{((bookingNext.data?.transitions ?? []) as string[]).map((status) => (<Button key={status} type="button" disabled={bookingMove.loading} onClick={() => { bookingMove.run({ "status": status }).then(() => bookingNext.reload(), () => undefined); }}>{status}</Button>))}{bookingMove.error ? <p role="alert" className="text-sm text-red-600">{bookingMove.error.message}</p> : null}</div><a href="/bookings">К списку записей</a>
    </motion.div>
  );
}

export default function BookingsIdPage() {
  const ready = useRequireAuth("/login");
  if (!ready) return null;
  return <BookingsIdPageContent />;
}
