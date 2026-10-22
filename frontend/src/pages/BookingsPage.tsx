import { useRequireAuth } from "@/lib/use-require-auth";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { signOut } from "@/lib/session";
import { useApiData } from "@/lib/use-api-data";
import { motion } from "framer-motion";

function BookingsPageContent() {
  const bookingsList = useApiData<Record<string, unknown>[]>("/bookings");
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Table><TableHeader><TableRow><TableHead>Когда</TableHead><TableHead>Клиент</TableHead><TableHead>Телефон</TableHead><TableHead>Статус</TableHead><TableHead>Комментарий</TableHead></TableRow></TableHeader><TableBody>{bookingsList.loading ? (<TableRow><TableCell>Loading…</TableCell></TableRow>) : bookingsList.error ? (<TableRow><TableCell>{bookingsList.error.message}</TableCell></TableRow>) : (bookingsList.data ?? []).length === 0 ? (<TableRow><TableCell>No records yet.</TableCell></TableRow>) : null}{(bookingsList.data ?? []).map((row, index) => (<TableRow key={index}>{["startsAt", "clientName", "clientPhone", "status", "notes"].map((key) => (<TableCell key={key}>{String(row[key] ?? "")}</TableCell>))}</TableRow>))}</TableBody></Table><Button onClick={() => { void signOut("/login"); }}>Выйти</Button>
    </motion.div>
  );
}

export default function BookingsPage() {
  const ready = useRequireAuth("/login");
  if (!ready) return null;
  return <BookingsPageContent />;
}
