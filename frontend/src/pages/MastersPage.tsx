import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApiData } from "@/lib/use-api-data";
import { motion } from "framer-motion";

export default function MastersPage() {
  const masters = useApiData<Record<string, unknown>[]>("/masters?sort=-createdAt");
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Table><TableHeader><TableRow><TableHead>name</TableHead><TableHead>specialty</TableHead><TableHead>phone</TableHead></TableRow></TableHeader><TableBody>{masters.loading ? (<TableRow><TableCell>Loading…</TableCell></TableRow>) : masters.error ? (<TableRow><TableCell>{masters.error.message}</TableCell></TableRow>) : (masters.data ?? []).length === 0 ? (<TableRow><TableCell>No records yet.</TableCell></TableRow>) : null}{(masters.data ?? []).map((row, index) => (<TableRow key={index}>{["name", "specialty", "phone"].map((key) => (<TableCell key={key}>{String(row[key] ?? "")}</TableCell>))}</TableRow>))}</TableBody></Table>
    </motion.div>
  );
}
