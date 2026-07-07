"use client";

import Image from "next/image";
import Link from "next/link";
import type { SystemWorkflowListItem } from "@galaxy/schemas";
import { DEFAULT_WORKFLOW_THUMBNAIL } from "@/lib/workflowDefaults";

export function SystemWorkflowCard({ workflow }: { workflow: SystemWorkflowListItem }) {
  return (
    <Link
      href={`/workflows/${workflow.slug}`}
      className="group w-[80vw] max-w-xs flex-none overflow-hidden rounded-radius-xxl border border-width-s border-boarder-tertiary bg-surface-main-background-2 text-left transition-colors hover:border-boarder-secondary sm:w-72 lg:w-80"
      style={{ scrollSnapAlign: "start" }}
    >
      <div className="relative aspect-[288/196] bg-surface-main-background-3">
        <Image
          src={workflow.thumbnailUrl ?? DEFAULT_WORKFLOW_THUMBNAIL}
          alt={workflow.name}
          fill
          className="object-cover"
          sizes="(min-width: 1024px) 320px, (min-width: 640px) 288px, 80vw"
        />
      </div>
      <div className="flex items-center justify-center px-space-05 py-space-04">
        <div className="truncate text-section-title-google text-text-primary">{workflow.name}</div>
      </div>
    </Link>
  );
}
