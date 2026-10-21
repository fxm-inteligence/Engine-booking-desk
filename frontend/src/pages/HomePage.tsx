import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApiData } from "@/lib/use-api-data";
import { motion } from "framer-motion";

export default function HomePage() {
  const services = useApiData<Record<string, unknown>[]>("/services?sort=-createdAt");
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Table><TableHeader><TableRow><TableHead>name</TableHead><TableHead>durationMinutes</TableHead><TableHead>price</TableHead><TableHead>active</TableHead></TableRow></TableHeader><TableBody>{services.loading ? (<TableRow><TableCell>Loading…</TableCell></TableRow>) : services.error ? (<TableRow><TableCell>{services.error.message}</TableCell></TableRow>) : (services.data ?? []).length === 0 ? (<TableRow><TableCell>No records yet.</TableCell></TableRow>) : null}{(services.data ?? []).map((row, index) => (<TableRow key={index}>{["name", "durationMinutes", "price", "active"].map((key) => (<TableCell key={key}>{String(row[key] ?? "")}</TableCell>))}</TableRow>))}</TableBody></Table>
    </motion.div>
  );
}
