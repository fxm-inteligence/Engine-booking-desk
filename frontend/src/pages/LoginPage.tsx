import { useAppStore } from "../store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApiWrite } from "@/lib/use-api-data";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";

const LoginPageSchema = z.object({
  password: z.string().min(1, "Required"),
  email: z.string().email("Invalid email"),
});
type LoginPageFormValues = z.infer<typeof LoginPageSchema>;

export default function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginPageFormValues>({ resolver: zodResolver(LoginPageSchema) });
  const addSubmittedEntry = useAppStore((state) => state.addSubmittedEntry);
  const login = useApiWrite("/auth/login", "POST");

  async function onSubmit(values: LoginPageFormValues) {
    addSubmittedEntry(values);
    try {
      await login.run(values);

      reset(); window.location.replace("/bookings");
    } catch {
      // Surfaced through the Write Block's `error`.
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <label className="flex flex-col gap-1 text-sm"><span>Почта</span><Input type="email" {...register("email")} /></label>{errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}<label className="flex flex-col gap-1 text-sm"><span>Пароль</span><Input type="password" {...register("password")} /></label>{errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}<Button type="submit">Войти</Button>
      </form>
    </motion.div>
  );
}
