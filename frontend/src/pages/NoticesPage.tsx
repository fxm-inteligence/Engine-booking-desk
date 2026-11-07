import { useRequireAuth } from "@/lib/use-require-auth";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { signOut } from "@/lib/session";
import { useApiData } from "@/lib/use-api-data";
import { motion } from "framer-motion";

function NoticesPageContent() {
  const noticesList = useApiData<Record<string, unknown>[]>("/notices?sort=-createdAt");
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Table><TableHeader><TableRow><TableHead>Что</TableHead><TableHead>Клиент</TableHead><TableHead>Телефон</TableHead><TableHead>Когда</TableHead><TableHead>Создано</TableHead></TableRow></TableHeader><TableBody>{noticesList.loading ? (<TableRow><TableCell>Loading…</TableCell></TableRow>) : noticesList.error ? (<TableRow><TableCell>{noticesList.error.message}</TableCell></TableRow>) : (noticesList.data ?? []).length === 0 ? (<TableRow><TableCell>No records yet.</TableCell></TableRow>) : null}{(noticesList.data ?? []).map((row, index) => (<TableRow key={index}>{["kind", "clientName", "clientPhone", "startsAt", "createdAt"].map((key) => (<TableCell key={key}>{String(row[key] ?? "")}</TableCell>))}</TableRow>))}</TableBody></Table><a href="/bookings">Записи</a><Button onClick={() => { void signOut("/login"); }}>Выйти</Button>
    </motion.div>
  );
}

export default function NoticesPage() {
  const ready = useRequireAuth("/login");
  if (!ready) return null;
  return <NoticesPageContent />;
}
