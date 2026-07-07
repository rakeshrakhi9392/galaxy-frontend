import Link from "next/link";
import { ArrowLeft, Workflow } from "lucide-react";
import { RelativeTime } from "@/components/ClientRelativeTime";
import type { WorkflowListItem } from "@/lib/types";

export function WorkflowSidebar({
  workflows,
  activeId,
}: {
  workflows: WorkflowListItem[];
  activeId: string;
}) {
  return (
    <aside className="hidden w-64 shrink-0 md:block lg:w-72">
      <div className="sticky top-5 flex max-h-[calc(100vh-6rem)] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-100 p-4 dark:border-zinc-800">
          <Link
            href="/workflows"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All workflows
          </Link>
          <h2 className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Your workflows</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {workflows.length === 0 ? (
            <p className="px-2 py-3 text-sm text-zinc-500">No workflows yet.</p>
          ) : (
            <ul className="space-y-1">
              {workflows.map((workflow) => {
                const isActive = workflow.id === activeId;

                return (
                  <li key={workflow.id}>
                    <Link
                      href={`/workflows/${workflow.id}`}
                      className={[
                        "flex items-start gap-3 rounded-lg px-3 py-2.5 transition",
                        isActive
                          ? "bg-zinc-100 dark:bg-zinc-900"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-900/60",
                      ].join(" ")}
                    >
                      <div
                        className={[
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                          isActive
                            ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-black"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
                        ].join(" ")}
                      >
                        <Workflow className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className={[
                            "truncate text-sm font-medium",
                            isActive
                              ? "text-zinc-900 dark:text-zinc-50"
                              : "text-zinc-800 dark:text-zinc-200",
                          ].join(" ")}
                        >
                          {workflow.name}
                        </div>
                        <RelativeTime
                          date={workflow.updatedAt}
                          className="mt-0.5 block text-xs text-zinc-500"
                        />
                      </div>
                      {isActive ? (
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-900 dark:bg-zinc-50" />
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
}
