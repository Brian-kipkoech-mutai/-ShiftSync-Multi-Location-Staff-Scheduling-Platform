"use client";

import { useRealtimeSync } from "@/hooks/useRealtimeSync";

export function RealtimeProvider({ userId }: { userId: string }) {
  useRealtimeSync(userId);
  return null;
}
