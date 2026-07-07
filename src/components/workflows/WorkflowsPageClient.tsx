"use client";

import { useAuth } from "@clerk/nextjs";
import { Plus, Search, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  parseSystemWorkflowsListResponse,
  parseWorkflowsListResponse,
  type SystemWorkflowListItem,
  type WorkflowListItem,
} from "@galaxy/schemas";
import {
  ChatUploadPopoverContent,
  useChatUploadPopover,
} from "@/components/workflows/ChatUploadPopover";
import { WorkflowActionLoader } from "@/components/workflows/WorkflowActionLoader";
import { WorkflowCard } from "@/components/workflows/WorkflowCard";
import { SystemWorkflowCard } from "@/components/workflows/SystemWorkflowCard";
import { fetchJsonWithEtag, invalidateHttpCache } from "@/lib/httpCache";
import { AuthRequiredError, useClientApi } from "@/lib/useClientApi";

const PAGE_SIZE = 20;

type WorkflowsPageClientProps = {
  createWorkflowAction: () => Promise<void>;
  importWorkflowAction: (formData: FormData) => Promise<string>;
};

type ListLoadState = "loading" | "ready" | "error";

export function WorkflowsPageClient({
  createWorkflowAction,
  importWorkflowAction,
}: WorkflowsPageClientProps) {
  const router = useRouter();
  const { isLoaded: authLoaded } = useAuth();
  const { clientRequest } = useClientApi();
  const importButtonRef = useRef<HTMLButtonElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const {
    open: importPopoverOpen,
    position: importPopoverPosition,
    popoverRef: importPopoverRef,
    togglePopover: toggleImportPopover,
    closePopover: closeImportPopover,
  } = useChatUploadPopover(importButtonRef);

  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [systemItems, setSystemItems] = useState<SystemWorkflowListItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loadState, setLoadState] = useState<ListLoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const reloadLists = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    if (!authLoaded) return;

    let cancelled = false;

    async function loadLists() {
      setLoadState("loading");
      setErrorMessage(null);

      try {
        const [list, system] = await Promise.all([
          fetchJsonWithEtag(
            `/api/v1/workflows?page=1&pageSize=${PAGE_SIZE}`,
            parseWorkflowsListResponse,
            clientRequest,
          ),
          fetchJsonWithEtag(
            "/api/v1/system-workflows",
            parseSystemWorkflowsListResponse,
            clientRequest,
          ),
        ]);

        if (cancelled) return;

        setWorkflows(list.items);
        setPage(list.page);
        setHasMore(list.hasMore);
        setTotal(list.total);
        setSystemItems(system.items);
        setLoadState("ready");
      } catch (error) {
        if (cancelled) return;

        const message =
          error instanceof AuthRequiredError
            ? "Sign in to view your workflows."
            : error instanceof Error
              ? error.message
              : "Failed to load workflows";

        setErrorMessage(message);
        setLoadState("error");
      }
    }

    void loadLists();

    return () => {
      cancelled = true;
    };
  }, [authLoaded, clientRequest, reloadToken]);

  const filteredWorkflows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return workflows;
    return workflows.filter((workflow) => workflow.name.toLowerCase().includes(normalized));
  }, [query, workflows]);

  async function handleCreate() {
    if (creating) return;
    setCreating(true);
    try {
      await createWorkflowAction();
    } finally {
      setCreating(false);
    }
  }

  function handleUploadFromDevice() {
    closeImportPopover();
    importInputRef.current?.click();
  }

  function handleSelectAsset() {
    closeImportPopover();
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || importing) return;

    setImporting(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const workflowId = await importWorkflowAction(formData);
      router.push(`/workflows/${workflowId}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to import workflow";
      window.alert(message);
    } finally {
      setImporting(false);
    }
  }

  async function handleLoadMore() {
    if (loadingMore || !hasMore || loadState !== "ready") return;

    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const list = await fetchJsonWithEtag(
        `/api/v1/workflows?page=${nextPage}&pageSize=${PAGE_SIZE}`,
        parseWorkflowsListResponse,
        clientRequest,
      );
      setWorkflows((current) => [...current, ...list.items]);
      setPage(list.page);
      setHasMore(list.hasMore);
      setTotal(list.total);
    } finally {
      setLoadingMore(false);
    }
  }

  function handleWorkflowDeleted(id: string) {
    invalidateHttpCache("/api/v1/workflows");
    invalidateHttpCache(`/api/v1/workflows/${id}`);
    setWorkflows((current) => current.filter((item) => item.id !== id));
    setTotal((current) => Math.max(0, current - 1));
  }

  function handleThumbnailUpdated(id: string, thumbnailUrl: string | null) {
    invalidateHttpCache("/api/v1/workflows");
    invalidateHttpCache(`/api/v1/workflows/${id}`);
    setWorkflows((current) =>
      current.map((item) => (item.id === id ? { ...item, thumbnailUrl } : item)),
    );
  }

  function handleWorkflowRenamed(id: string, name: string) {
    invalidateHttpCache("/api/v1/workflows");
    invalidateHttpCache(`/api/v1/workflows/${id}`);
    setWorkflows((current) =>
      current.map((item) => (item.id === id ? { ...item, name } : item)),
    );
  }

  const showInitialLoading = !authLoaded || loadState === "loading";

  return (
    <div className="workflows-page min-h-full w-full bg-surface-main-background">
      <div className="w-full pb-space-08 pl-[60px] pr-[60px] pt-space-08">
        <div className="flex flex-col gap-space-05 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex min-w-0 items-start gap-space-03">
              <div className="min-w-0">
                <div className="text-heading-lg-google text-text-primary">
                  Flow
                </div>
                <div className="text-small text-text-secondary">
                  Build workflows or run models directly
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-space-03">
            <button
              ref={importButtonRef}
              type="button"
              onClick={toggleImportPopover}
              disabled={importing || showInitialLoading}
              aria-haspopup="dialog"
              aria-expanded={importPopoverOpen}
              className="inline-flex h-9 items-center gap-space-03 rounded-radius-l bg-surface-primary px-space-04 text-button-google text-text-primary transition-colors duration-150 hover:bg-surface-secondary disabled:opacity-40"
              title="Import workflow JSON"
            >
              <Upload className="h-4 w-4 text-icon-primary" aria-hidden="true" />
              Import
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating || showInitialLoading}
              className="inline-flex h-9 w-9 items-center justify-center rounded-radius-l bg-surface-on-action text-icon-on-action transition-colors hover:opacity-90 disabled:opacity-40"
              title="Create a new workflow"
              aria-label="New workflow"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <input
          ref={importInputRef}
          hidden
          accept="application/json,.json"
          type="file"
          onChange={(event) => {
            void handleImport(event);
          }}
        />

        <ChatUploadPopoverContent
          open={importPopoverOpen}
          position={importPopoverPosition}
          popoverRef={importPopoverRef}
          onUploadFromDevice={handleUploadFromDevice}
          onSelectAsset={handleSelectAsset}
        />

        {importing ? <WorkflowActionLoader message="Importing workflow..." /> : null}

        {loadState === "error" ? (
          <div className="mt-space-09 rounded-radius-xxl border border-dashed border-boarder-tertiary bg-surface-main-background-2 px-space-07 py-space-09 text-center">
            <div className="text-body text-text-primary">Could not load workflows</div>
            <div className="mt-space-03 text-small text-text-secondary">
              {errorMessage ?? "Something went wrong."}
            </div>
            <button
              type="button"
              onClick={reloadLists}
              className="mt-space-06 inline-flex h-10 items-center rounded-radius-l bg-surface-primary px-space-05 text-button text-text-primary transition-colors hover:bg-surface-secondary"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <div className="mt-space-09">
              <div className="flex items-start justify-between gap-space-03 sm:items-center">
                <div>
                  <div className="text-section-title-google text-text-primary">System Workflows</div>
                  <div className="text-body-google text-text-secondary">
                    Prebuilt workflow templates - click to open and start using.
                  </div>
                </div>
              </div>

              <div className="mt-space-06">
                {showInitialLoading ? (
                  <div
                    className="flex gap-space-07 overflow-x-auto pb-space-02"
                    aria-busy="true"
                    aria-label="Loading system workflows"
                  >
                    {Array.from({ length: 3 }, (_, index) => (
                      <div
                        key={index}
                        className="h-[240px] w-[80vw] max-w-xs flex-none animate-pulse rounded-radius-xxl bg-surface-main-background-3 sm:w-72 lg:w-80"
                      />
                    ))}
                  </div>
                ) : systemItems.length === 0 ? (
                  <div className="rounded-radius-xxl border border-dashed border-boarder-tertiary bg-surface-main-background-2 px-space-07 py-space-07 text-center text-small text-text-secondary">
                    No system workflows available.
                  </div>
                ) : (
                  <div
                    className="flex gap-space-07 overflow-x-auto scroll-smooth pb-space-02 scrollbar-none"
                    style={{ scrollSnapType: "x mandatory" }}
                  >
                    {systemItems.map((workflow) => (
                      <SystemWorkflowCard key={workflow.slug} workflow={workflow} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-space-09">
              <div className="flex flex-col gap-space-04 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-section-title-google text-text-primary">Your Workflows</div>
                  <div className="text-body-google text-text-secondary">
                    Open one to edit, run, and review history.
                  </div>
                </div>

                <div className="relative w-full sm:w-[264px]">
                  <Search
                    size={20}
                    className="pointer-events-none absolute left-space-05 top-1/2 -translate-y-1/2 text-icon-tertiary"
                    aria-hidden="true"
                  />
                  <input
                    placeholder="Search workflows..."
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    disabled={showInitialLoading}
                    className="h-10 w-full rounded-radius-xl border-[0.667px] border-boarder-tertiary bg-surface-main-background-2 pl-[44px] pr-space-04 text-section-title-google text-text-primary outline-none transition-colors duration-150 placeholder:text-text-tertiary focus:border-boarder-secondary disabled:opacity-40"
                    type="text"
                  />
                </div>
              </div>

              {showInitialLoading ? (
                <div
                  className="mt-space-06 grid grid-cols-1 gap-space-07 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                  aria-busy="true"
                  aria-label="Loading your workflows"
                >
                  {Array.from({ length: 8 }, (_, index) => (
                    <div
                      key={index}
                      className="aspect-[288/220] animate-pulse rounded-radius-xxl bg-surface-main-background-3"
                    />
                  ))}
                </div>
              ) : filteredWorkflows.length === 0 ? (
                <div className="mt-space-06 rounded-radius-xxl border border-dashed border-boarder-tertiary bg-surface-main-background-2 px-space-07 py-space-09 text-center">
                  <div className="text-body text-text-primary">
                    {workflows.length === 0 ? "No workflows yet" : "No matching workflows"}
                  </div>
                  <div className="mt-space-03 text-small text-text-secondary">
                    {workflows.length === 0
                      ? "Create a workflow with the + button or start from a system template."
                      : "Try a different search term."}
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-space-06 grid grid-cols-1 gap-space-07 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {filteredWorkflows.map((workflow) => (
                      <WorkflowCard
                        key={workflow.id}
                        workflow={workflow}
                        onDeleted={handleWorkflowDeleted}
                        onThumbnailUpdated={handleThumbnailUpdated}
                        onRenamed={handleWorkflowRenamed}
                      />
                    ))}
                  </div>

                  {hasMore && !query.trim() ? (
                    <div className="mt-space-07 flex justify-center">
                      <button
                        type="button"
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="inline-flex h-10 items-center rounded-radius-l bg-surface-primary px-space-05 text-button text-text-primary transition-colors hover:bg-surface-secondary disabled:opacity-40"
                      >
                        {loadingMore ? "Loading..." : "Load more"}
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
