"use client";

import {
  FilledGlobeIcon,
  FilledListIcon,
  FilledMountainIcon,
} from "@/components/icons/tab-icons";

type Tab = "map" | "list" | "figure";

type AppNavigationProps = {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
};

const SIDEBAR_TABS: { id: Tab; label: string }[] = [
  { id: "map", label: "マップ" },
  { id: "list", label: "一覧" },
  { id: "figure", label: "形象" },
];

const BOTTOM_TABS: { id: Tab; label: string }[] = [
  { id: "map", label: "Map" },
  { id: "list", label: "一覧" },
  { id: "figure", label: "地形" },
];

export function AppNavigation({ activeTab, onTabChange }: AppNavigationProps) {
  return (
    <>
      <aside className="hidden w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 md:flex">
        <div className="border-b border-zinc-800 px-5 py-6">
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
            WMD Map
          </p>
          <h1 className="mt-1 text-lg font-semibold text-white">月明洞マップ</h1>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {SIDEBAR_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={[
                  "rounded-lg px-4 py-3 text-left text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-zinc-800 text-white shadow-sm"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100",
                ].join(" ")}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur-md md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label="メインナビゲーション"
      >
        <div className="grid h-16 grid-cols-3">
          {BOTTOM_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={[
                  "flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                  isActive
                    ? "bg-zinc-200 text-zinc-900"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700",
                ].join(" ")}
              >
                <TabIcon tab={tab.id} active={isActive} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}

function TabIcon({ tab, active }: { tab: Tab; active: boolean }) {
  const className = `h-6 w-6 ${active ? "text-zinc-900" : "text-zinc-400"}`;

  if (tab === "map") {
    return <FilledGlobeIcon className={className} />;
  }

  if (tab === "list") {
    return <FilledListIcon className={className} />;
  }

  return <FilledMountainIcon className={className} />;
}
