import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <main className="min-h-screen min-w-0 flex-1">{children}</main>
    </div>
  );
}
