"use client";

import { useEffect } from "react";
import { RefreshCwIcon, WifiOffIcon } from "lucide-react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html>
      <body className="flex min-h-screen items-center justify-center bg-background font-sans text-foreground">
        <div className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <WifiOffIcon className="size-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold">Service temporarily unavailable</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              The server couldn't be reached. Please try again in a moment.
            </p>
          </div>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent"
          >
            <RefreshCwIcon className="size-4" />
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
