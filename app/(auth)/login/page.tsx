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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-foreground">ShiftSync</h1>
          <p className="text-sm text-muted-foreground mt-1">Coastal Eats Scheduling</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
