import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardRedirectPage() {
  const user = await getSessionUser();

  if (user.role === "admin") redirect("/admin");
  if (user.role === "manager") redirect("/manager");
  redirect("/staff");
}
