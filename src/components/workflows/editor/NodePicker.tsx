"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Clock3, ChevronRight, Search, X } from "lucide-react";
import { nodeDefinitions } from "@/generated/nodeRegistry";
import {
  filterPaletteLeaves,
  getPaletteLeafIcon,
  listPaletteLeaves,
  type PaletteCategory,
  type PaletteGroup,
  type PaletteLeafEntry,
  visiblePaletteCategories,
} from "@/lib/editor/nodePalette";

const RECENTS_KEY = "galaxy.recentNodes.v1";
const PICKER_HEIGHT = 430;
const HEADER_HEIGHT = 60;
const SCROLL_HEIGHT = PICKER_HEIGHT - HEADER_HEIGHT;
const FLYOUT_WIDTH = 220;
const FLYOUT_GAP = 4;
const HOVER_CLOSE_DELAY_MS = 120;

function loadRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.slice(0, 4) : [];
  } catch {
    return [];
  }
}

function saveRecent(type: string) {
  const recents = [type, ...loadRecents().filter((t) => t !== type)].slice(0, 4);
  localStorage.setItem(RECENTS_KEY, JSON.stringify(recents));
}

export function NodePicker({
  open,
  onClose,
  onPick,
  anchorRef,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (type: string) => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const [query, setQuery] = useState("");
  const [recents, setRecents] = useState<string[]>([]);
  const [activeFlyout, setActiveFlyout] = useState<{
    group: PaletteGroup;
    groupKey: string;
    top: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const flyoutCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const registeredTypes = useMemo(
    () => new Set(nodeDefinitions.map((d) => d.type)),
    [],
  );

  const allLeaves = useMemo(() => listPaletteLeaves(registeredTypes), [registeredTypes]);
  const filteredLeaves = useMemo(
    () => filterPaletteLeaves(allLeaves, query),
    [allLeaves, query],
  );
  const categories = useMemo(
    () => visiblePaletteCategories(registeredTypes, query),
    [registeredTypes, query],
  );

  const recentEntries = useMemo(() => {
    if (query.trim()) return [];
    return recents
      .map((type) => allLeaves.find((l) => l.type === type))
      .filter((l): l is PaletteLeafEntry => Boolean(l));
  }, [recents, allLeaves, query]);

  useEffect(() => {
    if (open) {
      setRecents(loadRecents());
      setQuery("");
      setActiveFlyout(null);
    }
  }, [open]);

  const clearFlyoutCloseTimer = useCallback(() => {
    if (flyoutCloseTimerRef.current) {
      clearTimeout(flyoutCloseTimerRef.current);
      flyoutCloseTimerRef.current = null;
    }
  }, []);

  const scheduleFlyoutClose = useCallback(() => {
    clearFlyoutCloseTimer();
    flyoutCloseTimerRef.current = setTimeout(() => setActiveFlyout(null), HOVER_CLOSE_DELAY_MS);
  }, [clearFlyoutCloseTimer]);

  const showFlyout = useCallback(
    (group: PaletteGroup, groupKey: string, rowElement: HTMLElement) => {
      clearFlyoutCloseTimer();
      const menu = menuRef.current;
      if (!menu) return;

      const menuRect = menu.getBoundingClientRect();
      const rowRect = rowElement.getBoundingClientRect();

      setActiveFlyout({
        group,
        groupKey,
        top: rowRect.top - menuRect.top,
      });
    },
    [clearFlyoutCloseTimer],
  );

  useLayoutEffect(() => {
    if (!activeFlyout || !menuRef.current) return;

    const groupKey = activeFlyout.groupKey;

    function syncFlyoutTop() {
      const menu = menuRef.current;
      const row = scrollRef.current?.querySelector<HTMLElement>(`[data-flyout-group="${groupKey}"]`);
      if (!menu || !row) return;

      const menuRect = menu.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      const nextTop = rowRect.top - menuRect.top;

      setActiveFlyout((current) =>
        current?.groupKey === groupKey && Math.abs(current.top - nextTop) > 0.5
          ? { ...current, top: nextTop }
          : current,
      );
    }

    syncFlyoutTop();
    const scrollEl = scrollRef.current;
    scrollEl?.addEventListener("scroll", syncFlyoutTop);
    window.addEventListener("resize", syncFlyoutTop);
    return () => {
      scrollEl?.removeEventListener("scroll", syncFlyoutTop);
      window.removeEventListener("resize", syncFlyoutTop);
    };
  }, [activeFlyout?.groupKey]);

  useEffect(() => () => clearFlyoutCloseTimer(), [clearFlyoutCloseTimer]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onClick(e: MouseEvent) {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (menuRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  function handlePick(type: string) {
    saveRecent(type);
    onPick(type);
    onClose();
  }

  function handleDragStart(e: React.DragEvent, type: string) {
    e.dataTransfer.setData("application/galaxy-node-type", type);
    e.dataTransfer.effectAllowed = "copy";
  }

  const isSearching = query.trim().length > 0;

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Add node"
      className="absolute bottom-full left-1/2 z-50 mb-3 w-[280px] -translate-x-1/2 overflow-visible rounded-2xl border border-gray-200 bg-white/95 shadow-2xl backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95"
      style={{ height: PICKER_HEIGHT }}
    >
      <div className="p-2.5" style={{ height: HEADER_HEIGHT }}>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-zinc-400"
              aria-hidden
            />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search nodes or models..."
              className="w-full rounded-xl border border-transparent bg-transparent py-2 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-0 dark:text-white dark:placeholder-zinc-500"
            />
          </div>
          <button
            type="button"
            title="Close"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="overflow-y-auto px-2 pb-2" style={{ height: SCROLL_HEIGHT }}>
        {isSearching ? (
          <SearchResults leaves={filteredLeaves} onPick={handlePick} onDragStart={handleDragStart} />
        ) : (
          <>
            {recentEntries.length > 0 ? (
              <div className="pb-1">
                <div className="flex items-center gap-2 px-2 py-0.5 text-[11px] text-gray-500 dark:text-zinc-400">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden />
                  Recent
                </div>
                <div className="space-y-0">
                  {recentEntries.map((entry) => (
                    <LeafRow
                      key={`recent-${entry.type}`}
                      label={entry.label}
                      type={entry.type}
                      onPick={handlePick}
                      onDragStart={handleDragStart}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            <div className={recentEntries.length > 0 ? "pt-1" : undefined}>
              {categories.length === 0 ? (
                <p className="py-6 text-center text-xs text-gray-500 dark:text-zinc-400">
                  No nodes found.
                </p>
              ) : (
                categories.map((category, index) => (
                  <CategorySection
                    key={category.id}
                    category={category}
                    className={index > 0 ? "pt-1.5" : undefined}
                    onShowFlyout={showFlyout}
                    onScheduleFlyoutClose={scheduleFlyoutClose}
                    activeFlyoutKey={activeFlyout?.groupKey ?? null}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>

      {activeFlyout ? (
        <GroupFlyoutPanel
          group={activeFlyout.group}
          top={activeFlyout.top}
          onMouseEnter={clearFlyoutCloseTimer}
          onMouseLeave={scheduleFlyoutClose}
          onPick={handlePick}
          onDragStart={handleDragStart}
        />
      ) : null}
    </div>
  );
}

function SearchResults({
  leaves,
  onPick,
  onDragStart,
}: {
  leaves: PaletteLeafEntry[];
  onPick: (type: string) => void;
  onDragStart: (e: React.DragEvent, type: string) => void;
}) {
  if (leaves.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-gray-500 dark:text-zinc-400">No nodes found.</p>
    );
  }

  return (
    <div className="space-y-0">
      {leaves.map((leaf) => (
        <LeafRow
          key={leaf.type}
          label={leaf.label}
          type={leaf.type}
          subtitle={`${leaf.categoryLabel} · ${leaf.groupLabel}`}
          onPick={onPick}
          onDragStart={onDragStart}
        />
      ))}
    </div>
  );
}

function CategorySection({
  category,
  className,
  onShowFlyout,
  onScheduleFlyoutClose,
  activeFlyoutKey,
}: {
  category: PaletteCategory;
  className?: string;
  onShowFlyout: (group: PaletteGroup, groupKey: string, rowElement: HTMLElement) => void;
  onScheduleFlyoutClose: () => void;
  activeFlyoutKey: string | null;
}) {
  const Icon = category.icon;

  return (
    <div className={className}>
      <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-zinc-400">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {category.label}
      </div>
      <div className="flex flex-col gap-0">
        {category.groups.map((group) => {
          const groupKey = `${category.id}:${group.id}`;

          return (
            <GroupFlyoutRow
              key={groupKey}
              group={group}
              groupKey={groupKey}
              active={activeFlyoutKey === groupKey}
              onShowFlyout={onShowFlyout}
              onScheduleFlyoutClose={onScheduleFlyoutClose}
            />
          );
        })}
      </div>
    </div>
  );
}

function GroupFlyoutPanel({
  group,
  top,
  onMouseEnter,
  onMouseLeave,
  onPick,
  onDragStart,
}: {
  group: PaletteGroup;
  top: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onPick: (type: string) => void;
  onDragStart: (e: React.DragEvent, type: string) => void;
}) {
  return (
    <div
      role="menu"
      aria-label={group.label}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="absolute z-[60] overflow-hidden rounded-xl border border-gray-200 bg-white/95 shadow-xl backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95"
      style={{
        top,
        left: `calc(100% + ${FLYOUT_GAP}px)`,
        width: FLYOUT_WIDTH,
      }}
    >
      <div className="border-b border-gray-300 px-3 py-0.5 dark:border-zinc-600">
        <span className="text-[11px] font-medium text-gray-400 dark:text-zinc-500">{group.label}</span>
      </div>
      <div className="py-1">
        {group.nodes.map((leaf) => (
          <LeafRow
            key={leaf.type}
            label={leaf.label}
            type={leaf.type}
            icon={leaf.icon}
            onPick={onPick}
            onDragStart={onDragStart}
          />
        ))}
      </div>
    </div>
  );
}

function GroupFlyoutRow({
  group,
  groupKey,
  active,
  onShowFlyout,
  onScheduleFlyoutClose,
}: {
  group: PaletteGroup;
  groupKey: string;
  active: boolean;
  onShowFlyout: (group: PaletteGroup, groupKey: string, rowElement: HTMLElement) => void;
  onScheduleFlyoutClose: () => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={rowRef}
      data-flyout-group={groupKey}
      role="menuitem"
      aria-haspopup="menu"
      aria-expanded={active}
      onMouseEnter={() => {
        if (rowRef.current) onShowFlyout(group, groupKey, rowRef.current);
      }}
      onMouseLeave={onScheduleFlyoutClose}
      onFocus={() => {
        if (rowRef.current) onShowFlyout(group, groupKey, rowRef.current);
      }}
      onBlur={onScheduleFlyoutClose}
      tabIndex={0}
      className="flex cursor-default select-none items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-gray-50 focus:bg-gray-50 focus:outline-none dark:hover:bg-zinc-800/70 dark:focus:bg-zinc-800/70"
    >
      <span className="min-w-0 flex-1 text-[13px] leading-snug text-gray-700 dark:text-zinc-300">
        {group.label}
      </span>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-gray-400 dark:text-zinc-500"
        aria-hidden
      />
    </div>
  );
}

function LeafRow({
  label,
  type,
  subtitle,
  icon,
  onPick,
  onDragStart,
}: {
  label: string;
  type: string;
  subtitle?: string;
  icon?: LucideIcon;
  onPick: (type: string) => void;
  onDragStart: (e: React.DragEvent, type: string) => void;
}) {
  const Icon = icon ?? getPaletteLeafIcon(type);

  return (
    <div
      draggable
      role="menuitem"
      onClick={() => onPick(type)}
      onDragStart={(e) => onDragStart(e, type)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPick(type);
        }
      }}
      tabIndex={0}
      className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-zinc-800"
    >
      <Icon className="h-4 w-4 shrink-0 text-gray-700 dark:text-zinc-200" aria-hidden />
      <div className="min-w-0">
        <div className="truncate text-[13px] text-gray-700 dark:text-zinc-300">{label}</div>
        {subtitle ? (
          <div className="truncate text-[11px] text-gray-400 dark:text-zinc-500">{subtitle}</div>
        ) : null}
      </div>
    </div>
  );
}
