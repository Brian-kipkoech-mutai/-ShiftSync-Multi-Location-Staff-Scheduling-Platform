import { LoginForm } from "./login-form";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">ShiftSync</h1>
          <p className="text-sm text-slate-500 mt-1">Coastal Eats Scheduling</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
