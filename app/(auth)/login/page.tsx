import Image from "next/image";
import { LoginForm } from "./login-form";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Left — form */}
      <div className="flex flex-col gap-4 p-6 md:p-10">
        {/* Logo */}
        <div className="flex justify-center md:justify-start">
          <span className="flex items-center gap-2 font-semibold text-sm">
            <span className="flex size-6 items-center justify-center rounded-md bg-teal-600 text-white text-xs font-bold">
              S
            </span>
            ShiftSync
          </span>
        </div>

        {/* Form centred vertically */}
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>

      {/* Right — cover image (hidden on mobile) */}
      <div className="relative hidden lg:block bg-muted">
        <Image
          src="/login-cover.png"
          alt="Coastal Eats"
          fill
          className="object-cover  grayscale "
          priority
        />
      </div>
    </div>
  );
}
