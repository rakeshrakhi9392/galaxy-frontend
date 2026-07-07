import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";

export default function WorkflowsLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <div className="flex h-screen flex-col">{children}</div>
    </AppShell>
  );
}
