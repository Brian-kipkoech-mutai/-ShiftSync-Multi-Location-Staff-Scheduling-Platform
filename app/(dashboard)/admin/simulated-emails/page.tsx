import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SimulatedEmailsPage() {
  await requireRole(["admin"]);

  const emails = await prisma.simulatedEmail.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { sentAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="text-lg font-semibold text-foreground mb-1">Simulated Emails</h1>
      <p className="text-sm text-muted-foreground mb-5">Email notifications that would be sent in production</p>

      {emails.length === 0 ? (
        <p className="text-sm text-muted-foreground">No simulated emails yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {emails.map((e) => (
            <div key={e.id} className="bg-card border border-border rounded-md p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-snug">{e.subject}</p>
                <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                  {new Date(e.sentAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="text-xs text-teal-400">
                {e.user.name} &lt;{e.user.email}&gt;
              </p>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap mt-auto">{e.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
