import { useRequireAuth } from "@/lib/use-require-auth";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { signOut } from "@/lib/session";
import { useApiData } from "@/lib/use-api-data";
import { motion } from "framer-motion";

function ClientsPageContent() {
  const clientsList = useApiData<Record<string, unknown>[]>("/clients");
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Table><TableHeader><TableRow><TableHead>Имя</TableHead><TableHead>Телефон</TableHead><TableHead>Telegram</TableHead></TableRow></TableHeader><TableBody>{clientsList.loading ? (<TableRow><TableCell>Loading…</TableCell></TableRow>) : clientsList.error ? (<TableRow><TableCell>{clientsList.error.message}</TableCell></TableRow>) : (clientsList.data ?? []).length === 0 ? (<TableRow><TableCell>No records yet.</TableCell></TableRow>) : null}{(clientsList.data ?? []).map((row, index) => (<TableRow key={index}>{["name", "phone", "telegramId"].map((key) => (<TableCell key={key}>{String(row[key] ?? "")}</TableCell>))}</TableRow>))}</TableBody></Table><Button onClick={() => { void signOut("/login"); }}>Выйти</Button>
    </motion.div>
  );
}

export default function ClientsPage() {
  const ready = useRequireAuth("/login");
  if (!ready) return null;
  return <ClientsPageContent />;
}
