"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Location {
  id: string;
  name: string;
  timezone: string;
}

interface LocationSelectorProps {
  locations: Location[];
  selectedIds: string[];
}

export function LocationSelector({ locations, selectedIds }: LocationSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function toggle(locationId: string) {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.getAll("locationId");
    params.delete("locationId");

    let next: string[];
    if (current.includes(locationId)) {
      next = current.filter((id) => id !== locationId);
    } else {
      next = [...current, locationId];
    }
    next.forEach((id) => params.append("locationId", id));
    router.push(`${pathname}?${params.toString()}`);
  }

  function selectAll() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("locationId");
    router.push(`${pathname}?${params.toString()}`);
  }

  const allSelected = selectedIds.length === 0;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs text-muted-foreground mr-1">Locations:</span>
      <Badge
        variant={allSelected ? "default" : "outline"}
        onClick={selectAll}
        className={cn(
          "cursor-pointer h-6 rounded-sm text-xs",
          allSelected
            ? "bg-teal-600 hover:bg-teal-700 text-white border-0"
            : "hover:bg-accent"
        )}
      >
        All
      </Badge>
      {locations.map((loc) => {
        const isSelected = selectedIds.includes(loc.id);
        return (
          <Badge
            key={loc.id}
            variant={isSelected ? "default" : "outline"}
            onClick={() => toggle(loc.id)}
            className={cn(
              "cursor-pointer h-6 rounded-sm text-xs",
              isSelected
                ? "bg-teal-600 hover:bg-teal-700 text-white border-0"
                : "hover:bg-accent"
            )}
          >
            {loc.name}
          </Badge>
        );
      })}
    </div>
  );
}
