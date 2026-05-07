"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangleIcon, RefreshCwIcon, WifiOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

function isDbConnectionError(err: Error) {
  return (
    err.message.includes("Can't reach database server") ||
    err.message.includes("connection pool") ||
    err.message.includes("ECONNREFUSED") ||
    err.message.includes("connect ETIMEDOUT")
  );
}

export default function DashboardError({ error, reset }: Props) {
  const router = useRouter();

  useEffect(() => {
    console.error("[DashboardError]", error);
  }, [error]);

  const isDb = isDbConnectionError(error);

  function handleRetry() {
    router.refresh(); // invalidate Next.js router cache → forces fresh server render
    reset();          // re-render the error boundary segment
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
        {isDb ? <WifiOffIcon className="size-6" /> : <AlertTriangleIcon className="size-6" />}
      </div>

      <div className="space-y-1">
        <h2 className="text-base font-semibold">
          {isDb ? "Database temporarily unreachable" : "Something went wrong"}
        </h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          {isDb
            ? "The database server couldn't be reached. This is usually a transient network issue — try refreshing in a moment."
            : "An unexpected error occurred. If this keeps happening, contact support."}
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60">Error ID: {error.digest}</p>
        )}
      </div>

      <Button size="sm" onClick={handleRetry} className="gap-2">
        <RefreshCwIcon className="size-4" />
        Try again
      </Button>
    </div>
  );
}
