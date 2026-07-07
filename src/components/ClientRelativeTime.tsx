"use client";

import { useEffect, useState } from "react";
import { formatEditedTime, formatRelativeTime } from "@/lib/format";

type ClientRelativeTimeProps = {
  date: Date | string;
  className?: string;
};

function toIsoString(date: Date | string) {
  return typeof date === "string" ? date : date.toISOString();
}

function useRelativeLabel(date: Date | string, format: (value: Date) => string) {
  const iso = toIsoString(date);
  const [label, setLabel] = useState("");

  useEffect(() => {
    const parsed = new Date(iso);

    function refresh() {
      setLabel(format(parsed));
    }

    refresh();
    const intervalId = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(intervalId);
  }, [iso, format]);

  return label;
}

export function RelativeTime({ date, className }: ClientRelativeTimeProps) {
  const label = useRelativeLabel(date, formatRelativeTime);
  return <span className={className}>{label || "\u00a0"}</span>;
}

export function EditedTime({ date, className }: ClientRelativeTimeProps) {
  const label = useRelativeLabel(date, formatEditedTime);
  return <span className={className}>{label || "\u00a0"}</span>;
}
