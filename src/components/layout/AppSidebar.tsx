"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  BookOpen,
  Boxes,
  ChevronDown,
  FolderOpen,
  Gift,
  Library,
  MessageSquareMore,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { ArrowsSplitIcon } from "@/components/icons/ArrowsSplitIcon";

const SIDEBAR_STORAGE_KEY = "galaxy.sidebarCollapsed";
const EXPANDED_WIDTH = 296;
const COLLAPSED_WIDTH = 52;

const iconButtonClass =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[18px] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground dark:hover:bg-neutral-700 h-9 w-9 hover:!bg-surface-secondary";

const navItemClass =
  "chat-sidebar-nav-item group flex w-full items-center gap-[9px] overflow-clip rounded-radius-l p-space-03 text-sm font-normal leading-5 tracking-normal text-text-primary transition-colors";

type NavItem = {
  label: string;
  href: string;
  icon: ReactNode;
  external?: boolean;
  match?: (pathname: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "Tasks",
    href: "#",
    icon: <MessageSquareMore className="h-5 w-5" aria-hidden="true" />,
  },
  {
    label: "Projects",
    href: "#",
    icon: <FolderOpen className="h-5 w-5" aria-hidden="true" />,
  },
  {
    label: "Library",
    href: "#",
    icon: <Library className="h-5 w-5" aria-hidden="true" />,
  },
  {
    label: "Flow",
    href: "/workflows",
    icon: <ArrowsSplitIcon className="h-5 w-5" />,
    match: (pathname) => pathname === "/workflows" || pathname.startsWith("/workflows/"),
  },
  {
    label: "Tools",
    href: "#",
    icon: <Boxes className="h-5 w-5" aria-hidden="true" />,
  },
  {
    label: "API and MCP",
    href: "https://galaxy-api.mintlify.app/introduction",
    external: true,
    icon: <BookOpen className="h-5 w-5" aria-hidden="true" />,
  },
];

function NavLink({
  item,
  active,
  collapsed = false,
}: {
  item: NavItem;
  active: boolean;
  collapsed?: boolean;
}) {
  const className = [
    collapsed ? iconButtonClass : navItemClass,
    active ? "chat-sidebar-nav-item-active text-text-primary" : "",
    collapsed && active ? "chat-sidebar-nav-item-active" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const content = collapsed ? (
    item.icon
  ) : (
    <div className="flex items-center gap-[9px]">
      {item.icon}
      {item.label}
    </div>
  );

  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        title={collapsed ? item.label : undefined}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={item.href} className={className} title={collapsed ? item.label : undefined}>
      {content}
    </Link>
  );
}

function SidebarHeader({ onCollapse }: { onCollapse: () => void }) {
  return (
    <header className="flex h-[52px] shrink-0 items-center justify-between px-space-05">
      <Link href="/workflows" className="flex h-9 items-center">
        <Image
          src="/galaxy.png"
          alt="Magica"
          width={104}
          height={26}
          priority
          className="block h-[26px] w-[104px] dark:invert"
        />
      </Link>
      <button
        type="button"
        onClick={onCollapse}
        className={iconButtonClass}
        aria-label="Collapse sidebar"
      >
        <PanelLeftClose className="!h-5 !w-5" aria-hidden="true" />
      </button>
    </header>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [footerExpanded, setFooterExpanded] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored === "true") setCollapsed(true);
    setHydrated(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value;
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  }

  const shellWidth = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  if (!hydrated) {
    return (
      <div
        className="chat-sidebar-shell relative flex flex-shrink-0 flex-col overflow-hidden border-r border-width-xs border-boarder-tertiary bg-surface-secondary"
        style={{ width: EXPANDED_WIDTH }}
      />
    );
  }

  return (
    <div
      className="chat-sidebar-shell relative flex flex-shrink-0 flex-col overflow-hidden border-r border-width-xs border-boarder-tertiary bg-surface-secondary text-text-primary"
      style={{ width: shellWidth }}
    >
      {/* Collapsed icon rail */}
      <div
        className={[
          "group/sidebar h-full flex-col items-center",
          collapsed ? "flex" : "hidden",
        ].join(" ")}
        style={{ width: COLLAPSED_WIDTH }}
      >
        <button
          type="button"
          onClick={toggleCollapsed}
          className={`${iconButtonClass} relative mb-space-07 mt-space-03`}
          aria-label="Expand sidebar"
        >
          <Image
            src="/icon.png"
            alt="Magica"
            width={20}
            height={20}
            className="transition-opacity group-hover/sidebar:opacity-0 dark:invert"
          />
          <PanelLeftOpen
            className="absolute inset-0 m-auto !h-5 !w-5 opacity-0 transition-opacity group-hover/sidebar:opacity-100"
            aria-hidden="true"
          />
        </button>

        <div className="flex flex-col items-center gap-space-02">
          <button type="button" className={iconButtonClass} title="New task">
            <Plus className="!h-5 !w-5" aria-hidden="true" />
          </button>
          <button type="button" className={iconButtonClass} title="Search tasks">
            <Search className="!h-5 !w-5" aria-hidden="true" />
          </button>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.label}
              item={item}
              active={item.match ? item.match(pathname) : pathname === item.href}
              collapsed
            />
          ))}
        </div>

        <div className="mt-auto pb-4">
          <button type="button" className={`${iconButtonClass} h-8 w-8`} title="Settings">
            <Settings className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Expanded sidebar */}
      <div
        className={["flex h-full flex-col", collapsed ? "hidden" : "visible"].join(" ")}
        style={{ width: EXPANDED_WIDTH }}
      >
        <SidebarHeader onCollapse={toggleCollapsed} />

        <div className="flex flex-col gap-space-02 px-space-03 pb-space-02">
          <button type="button" className={`${navItemClass} justify-between`}>
            <div className="flex items-center gap-[9px]">
              <Plus className="h-5 w-5" aria-hidden="true" />
              New task
            </div>
            <span className="text-[10px] text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100">
              CtrlShift+O
            </span>
          </button>
          <button type="button" className={`${navItemClass} justify-between`}>
            <div className="flex items-center gap-[9px]">
              <Search className="h-5 w-5" aria-hidden="true" />
              Search tasks
            </div>
            <span className="text-[10px] text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100">
              CtrlK
            </span>
          </button>
        </div>

        <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-space-04 overflow-y-auto px-space-03 pb-space-03">
          <div className="flex flex-col gap-space-02">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.label}
                item={item}
                active={item.match ? item.match(pathname) : pathname === item.href}
              />
            ))}
          </div>
          <div className="px-3 py-8 text-center text-sm text-text-tertiary">No tasks yet</div>
        </div>

        <div className="relative z-10 flex-shrink-0 bg-surface-secondary px-2">
          <div
            className={[
              "transition-all duration-300 ease-in-out",
              footerExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 overflow-hidden opacity-0",
            ].join(" ")}
          >
            <div className="space-y-3 py-2">
              <Link
                href="/workflows/settings/api-keys"
                className="inline-flex h-8 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-[18px] border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900"
              >
                <Settings className="h-3.5 w-3.5" aria-hidden="true" />
                API Keys
              </Link>
              <button
                type="button"
                className="relative inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-[18px] bg-indigo-600/90 px-4 py-2 text-sm font-medium text-white shadow-lg transition-all duration-300 before:absolute before:inset-0 before:translate-x-[-200%] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:transition-transform before:duration-1000 before:ease-in-out hover:bg-indigo-700 hover:shadow-xl hover:before:translate-x-[200%]"
              >
                <Gift className="h-4 w-4" aria-hidden="true" />
                Claim Offer
              </button>
            </div>
          </div>

          <div className="border-t border-gray-200">
            <button
              type="button"
              onClick={() => setFooterExpanded((value) => !value)}
              className="flex w-full items-center justify-center py-1 text-gray-400 transition-all hover:bg-gray-50 hover:text-gray-600"
              aria-label={footerExpanded ? "Hide sidebar details" : "Show sidebar details"}
            >
              <ChevronDown
                className={[
                  "h-3 w-3 transition-transform",
                  footerExpanded ? "" : "-rotate-180",
                ].join(" ")}
                aria-hidden="true"
              />
            </button>
            <div className="flex items-center justify-center px-4 py-2">
              <Show when="signed-out">
                <SignInButton>
                  <button className="rounded-[18px] bg-surface-on-action px-4 py-2 text-sm font-medium text-text-on-action hover:opacity-90">
                    Sign in
                  </button>
                </SignInButton>
              </Show>
              <Show when="signed-in">
                <UserButton
                  appearance={{
                    elements: {
                      userButtonBox: "flex-row-reverse",
                      userButtonOuterIdentifier: "text-sm text-text-primary",
                    },
                  }}
                  showName
                />
              </Show>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
