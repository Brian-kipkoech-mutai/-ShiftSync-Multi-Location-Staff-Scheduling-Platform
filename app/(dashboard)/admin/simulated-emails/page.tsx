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
        <div className="space-y-2 max-w-3xl">
          {emails.map((e) => (
            <div key={e.id} className="bg-card border border-border rounded-md p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{e.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    To: {e.user.name} &lt;{e.user.email}&gt;
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {new Date(e.sentAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">{e.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
