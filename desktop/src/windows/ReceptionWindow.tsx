import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function ReceptionWindow() {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex flex-col items-start"><p>Записи на сегодня</p><Button>Новая запись</Button></div>
    </motion.div>
  );
}
