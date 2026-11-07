import { useRequireAuth } from "@/lib/use-require-auth";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { busyDays } from "@/lib/busy-days";
import { signOut } from "@/lib/session";
import { useApiData } from "@/lib/use-api-data";
import { motion } from "framer-motion";

function BookingsPageContent() {
  const bookingsList = useApiData<Record<string, unknown>[]>("/bookings");
  const busyTimes = useApiData<Record<string, unknown>[]>("/bookings/busy");
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Table><TableHeader><TableRow><TableHead>Когда</TableHead><TableHead>Клиент</TableHead><TableHead>Телефон</TableHead><TableHead>Статус</TableHead><TableHead>Комментарий</TableHead></TableRow></TableHeader><TableBody>{bookingsList.loading ? (<TableRow><TableCell>Loading…</TableCell></TableRow>) : bookingsList.error ? (<TableRow><TableCell>{bookingsList.error.message}</TableCell></TableRow>) : (bookingsList.data ?? []).length === 0 ? (<TableRow><TableCell>No records yet.</TableCell></TableRow>) : null}{(bookingsList.data ?? []).map((row, index) => (<TableRow key={index}>{["startsAt", "clientName", "clientPhone", "status", "notes"].map((key) => (<TableCell key={key}>{String(row[key] ?? "")}</TableCell>))}</TableRow>))}</TableBody></Table><Button onClick={() => { void signOut("/login"); }}>Выйти</Button><div className="grid gap-1 text-sm">{busyDays(busyTimes.data, 14, "").map((day) => (<div key={day.key} className="flex flex-wrap items-baseline gap-2"><span className="w-28 font-medium">{day.label}</span>{day.times.length === 0 ? <span className="text-slate-500">Свободно</span> : day.times.map((time) => (<span key={time} className="rounded bg-slate-200 px-2 py-0.5">{time}</span>))}</div>))}</div><a href="/notices">Уведомления</a><a href="/clients">Клиенты</a>
    </motion.div>
  );
}

export default function BookingsPage() {
  const ready = useRequireAuth("/login");
  if (!ready) return null;
  return <BookingsPageContent />;
}
